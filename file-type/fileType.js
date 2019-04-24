var AWS = require('aws-sdk');
var fileType = require('file-type');

function __getObject(Bucket, Key, endpoint, credentials, cb) {
    console.log('ENDPOINT', endpoint);
    const s3 = new AWS.S3({
	region: 'us-east-1',
	endpoint,
	credentials,
	s3ForcePathStyle: true
    });

    const Range = 'bytes=0-' + fileType.minimumBytes;

    s3.getObject({
	Bucket,
	Key,
        Range}, (err, data) => {
	    if (err) {
		return cb(err);
	    }
	    return cb(null, data.Body);
	});
}

module.exports = async function(context) {

    const Bucket = context.request.body.Bucket;
    const Key = context.request.body.Key;
    const tags = context.request.body.tags;
    const endpoint = context.request.body.endpoint;
    const credentials = context.request.body.credentials;

    console.log('FILE-TYPE 1');

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
	const _ftype = fileType(data);
	return {
	    status: 200,
	    body: _ftype ? _ftype : {}
	};
    } catch (err) {
	return {
	    status: 404,
	    body: err.message
	};
    }
}
