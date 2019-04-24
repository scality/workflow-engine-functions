var AWS = require('aws-sdk');
var Jimp = require('jimp');
var fs = require('fs');
var path = require('path');

function __getObject(Bucket, Key, endpoint, credentials, cb) {
    console.log('GET OBJ', endpoint, Bucket, Key);
    const s3 = new AWS.S3({
	region: 'us-east-1',
	endpoint,
	credentials,
	s3ForcePathStyle: true
    });

    s3.getObject({
	Bucket,
	Key}, (err, data) => {
	    if (err) {
		return cb(err);
	    }
	    return cb(null, data.Body);
	});
}

function __putObject(Bucket, Key, endpoint, credentials, ndata, cb) {
    console.log('PUT OBJ', endpoint, Bucket, Key);
    const s3 = new AWS.S3({
	region: 'us-east-1',
	endpoint,
	credentials,
	s3ForcePathStyle: true
    });

    s3.putObject({
	ACL: "public-read-write",
	Bucket,
	Key,
	Body: ndata}, (err, ans) => {
	    if (err) {
		return cb(err);
	    }
	    return cb(null, ans);
	});
}

module.exports = async function(context) {

    const Bucket = context.request.body.Bucket;
    const Key = context.request.body.Key;
    const tags = context.request.body.tags;
    const param = context.request.body.param;
    const endpoint = context.request.body.endpoint;
    const credentials = context.request.body.credentials;

    console.log('IMAGE 14', param);

    const _getObject = new Promise((resolve, reject) => {
	__getObject(Bucket, Key, endpoint, credentials, (err, data) => {
	    if (err) {
		reject(err);
	    }
	    console.log('data ok', data.toString().length);
	    resolve(data);
	});
    });

    let data;
    try {
	data = await _getObject;
    } catch (err) {
	return {
	    status: 404,
	    body: err.message
	};
    }
    
    try {
	const r1 = Math.random().toString(36).substring(10);
	const pathName1 = `/tmp/img_${r1}.jpg`;
	const r2 = Math.random().toString(36).substring(10);
	const pathName2 = `/tmp/img_${r2}.jpg`;
	fs.writeFileSync(pathName1, data);
	const image = await Jimp.read(pathName1);
	const args = param.split(/\s+/);
	console.log('ARGS', args);
	if (args[0] === 'rotate') {
	    if (args.length !== 2) {
		throw new Error('usage: rotate deg');
	    }
	    await image.rotate(parseInt(args[1]));
	} else if (args[0] === 'resize') {
	    if (args.length !== 3) {
		throw new Error('usage: resize w h');
	    }
	    await image.resize(parseInt(args[1]), parseInt(args[2]));
	} else {
	    throw new Error('unknown command');
	}
	await image.writeAsync(pathName2);
	var ndata = fs.readFileSync(pathName2);
	const extName = path.extname(Key);
	const outputFileName = 'output/' + Key + '/' + args.join('_') + extName;
	const _putObject = new Promise((resolve, reject) => {
	    __putObject(Bucket, outputFileName, endpoint, credentials, ndata, (err, ans) => {
                if (err) {
                    reject(err);
                }
                console.log('putObject ok');
                resolve(ans);
            });
        });
        const ans = await _putObject;
	console.log('ans', ans);
	fs.unlinkSync(pathName1);
	fs.unlinkSync(pathName2);
	return {
	    status: 200,
	    body: {}
	};
    } catch (err) {
	console.log('IMAGE error', err);
	return {
	    status: 200,
	    body: {}
	};
    }
}
