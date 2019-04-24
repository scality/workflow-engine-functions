#!/bin/sh
# XXX temp - all of this will be automated by the workflow-engine-operator
export CLOUDSERVER_ENDPOINT=$(kubectl get svc zenko-cloudserver -o yaml |grep clusterIP|cut -d: -f2|xargs)
export FISSION_ROUTER_ENDPOINT=$(kubectl -n fission get svc router -o yaml |grep clusterIP|cut -d: -f2|xargs)
export AWS_ACCESS_KEY_ID=$(grep aws_access_key_id ~/.aws/credentials |cut -d= -f2|xargs)
export AWS_SECRET_ACCESS_KEY=$(grep aws_secret_access_key ~/.aws/credentials |cut -d= -f2|xargs)

function ifexit() {
    if test "$?" -ne 0
    then
	echo Error: exiting...
	exit 1
    fi
}

function installfunc() {
    echo "Creating env if not yet created"
    fission environment create --name nodejs --image fission/node-env --builder fission/node-builder
    echo "Deleting httptrigger(s)"
    for i in `fission httptrigger list | grep "/${FUNC}" |cut -d" "  -f1`
    do
	fission httptrigger delete --name $i
    done
    echo "Deleting function"
    fission fn delete --name ${FUNC}
    echo "Deleting package(s)"
    for i in `fission package list | grep ${FUNC}- | cut -d" "  -f1`
    do
	fission package delete --name $i
    done
    cd ${folder}
    if [ -f pre-install.sh ]
    then
	echo "Executing pre-install"
	bash ./pre-install.sh
    fi
    echo "Deleting ZIP"
    rm -rf ${FUNC}.zip
    echo "Creating ZIP"
    zip ${FUNC}.zip ${ENTRYPOINT}.js package.json
    ifexit
    echo "Creating package"
    pkg=`fission package create --src ${FUNC}.zip --env ${ENV}|cut -d\' -f2`
    ifexit
    echo "Creating function"
    fission fn create --name ${FUNC} --pkg $pkg --env nodejs --entrypoint ${ENTRYPOINT}
    ifexit
    if [ -f test.sh ]
    then
	echo "Testing function"
	bash ./test.sh
	if [ "$?" -ne 0 ]
	then
	    echo test failed
	    exit 1
	fi
    fi
    cd ..
}

if [ "$#" -ne 1 ]
then
    echo usage: installfunc folder
    exit 1
fi

if [ -z "$KUBECONFIG" ]
then
    echo needs KUBECONFIG for fission
    exit 1
fi

folder=$1

source ${folder}/config
installfunc
exit 0
