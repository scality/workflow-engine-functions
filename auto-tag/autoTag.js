var AWS = require('aws-sdk');
var request = require('request');
var http = require('http');
const fs = require('fs');

function __getObject(Bucket, Key, endpoint, credentials, cb) {
    console.log('ENDPOINT', endpoint);
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

function __autoTag(data, cb) {
    const r = Math.random().toString(36).substring(10);
    const fileName = `test_${r}.jpg`;
    const pathName = `/tmp/${fileName}`
    fs.writeFile(pathName, data, (err) => {
	if (err) {
            console.log('ERROR FILE', err);
	    return cb(err);
	}
	var formData = {
	    image: {
		value: fs.createReadStream(pathName),
		options: {
		    filename: fileName,
		    contentType: 'image/jpeg'
		}
	    }
	};
	
	request.post({
	    url: 'http://go-tensorflow-image-recognition.default.svc.cluster.local:8080/recognize',
	    formData
	} ,
		     (err, res, body) => {
			 if (err) {
			     console.log('POST error', err);
			     return cb(err);
			 }
			 return cb(null, JSON.parse(body));
		     });
    });
}

module.exports = async function(context) {

    const Bucket = context.request.body.Bucket;
    const Key = context.request.body.Key;
    const tags = context.request.body.tags;
    const endpoint = context.request.body.endpoint;
    const credentials = context.request.body.credentials;

    console.log('AUTO-TAG 39');

    const _getObject = new Promise((resolve, reject) => {
	__getObject(Bucket, Key, endpoint, credentials, (err, data) => {
	    if (err) {
		reject(err);
	    }
	    console.log('data ok', data.toString().length);
	    resolve(data);
	});
    });

    try {
	const data = await _getObject;

	const _autoTag = new Promise((resolve, reject) => {
	    __autoTag(data, (err, _data) => {
		if (err) {
		    reject(err);
		}
		console.log('data ok', _data);
		resolve(_data);
	    });
	});
	const _tags = await _autoTag;

	console.log('TAGS', _tags);
	__tags = {};
	_tags.labels.forEach(item => {
	    console.log('ITEM', item);
	    __tags[item.label] = item.probability.toString();
	});

	return {
	    status: 200,
	    body: __tags
	};
    } catch (err) {
	return {
	    status: 404,
	    body: err.message
	};
    }
}
