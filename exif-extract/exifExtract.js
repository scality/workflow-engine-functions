var AWS = require('aws-sdk');
var ExifImage = require('exif').ExifImage;

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

function __getExifData(data, cb) {
    new ExifImage({ image : data }, (err, exifData) => {
	if (err) {
	    return cb(err);
	}
	return cb(null, exifData);
    });
}

module.exports = async function(context) {

    const Bucket = context.request.body.Bucket;
    const Key = context.request.body.Key;
    const tags = context.request.body.tags;
    const param = context.request.body.param;
    const endpoint = context.request.body.endpoint;
    const credentials = context.request.body.credentials;

    console.log('EXIF-EXTRACT 24', param);

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
	const _getExifData = new Promise((resolve, reject) => {
	    __getExifData(data, (err, exifData) => {
		if (err) {
		    reject(err);
		}
		console.log('exifData ok');
		resolve(exifData);
	    });
	});
	const exifData = await _getExifData;
	
	const resolve = (obj=self, path) => {
	    const separator = '.';
	    var properties = Array.isArray(path) ? path : path.split(separator)
	    return properties.reduce((prev, curr) => prev && prev[curr], obj)
	}
	
	const _exifData = {};
	param.split(',').forEach(kv => {
	    _kv=kv.split('=');
	    _exifData[_kv[0].trim()] = resolve(exifData, _kv[1].trim());
	});

	console.log('_exifData', _exifData);

	return {
	    status: 200,
	    body: _exifData
	};
    } catch (err) {
	console.log('EXIF error', err);
	return {
	    status: 200,
	    body: {}
	};
    }
}
