#!/bin/sh

function ifexit() {
    if test "$?" -ne 0
    then
	echo Error: exiting...
	exit 1
    fi
}

source ./config

if [ -z "$CLOUDSERVER_ENDPOINT" -o -z "$FISSION_ROUTER_ENDPOINT" ]
then
    echo missing env vars
    exit 1
fi

TEST_BUCKET=test-file-type
TEST_FILE=test1.jpg
aws --endpoint "http://${CLOUDSERVER_ENDPOINT}" s3 mb "s3://${TEST_BUCKET}"
aws --endpoint "http://${CLOUDSERVER_ENDPOINT}" s3 cp "${TEST_FILE}" "s3://${TEST_BUCKET}"
body="{\"endpoint\": \"http://zenko-cloudserver.default.svc.cluster.local:80\", \"credentials\": {\"accessKeyId\": \"${AWS_ACCESS_KEY_ID}\", \"secretAccessKey\": \"${AWS_SECRET_ACCESS_KEY}\" }, \"Bucket\": \"${TEST_BUCKET}\", \"Key\": \"test1.jpg\", \"tags\": {}}"
echo $body
result=`fission fn test --name ${FUNC} -H "Content-Type: application/json" --method ${METHOD} -b "${body}"`
ifexit
echo $result |grep image/jpeg
ifexit
echo "Creating httptrigger"
httptrigger=`fission httptrigger create --url /${FUNC} --function ${FUNC} --method POST|cut -d\' -f2`
ifexit
echo "Testing httptrigger"
curl http://${FISSION_ROUTER_ENDPOINT}/${FUNC} -X${METHOD} -H "Content-Type: application/json" -d "${body}"
ifexit
aws --endpoint "http://${CLOUDSERVER_ENDPOINT}" s3 rm "s3://${TEST_BUCKET}/${TEST_FILE}"
aws --endpoint "http://${CLOUDSERVER_ENDPOINT}" s3 rb "s3://${TEST_BUCKET}"
exit 0
