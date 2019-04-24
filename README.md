
# Pre-requisites

$ helm install --name fission --namespace fission --set serviceType=NodePort,routerServiceType=NodePort https://github.com/fission/fission/releases/download/1.4.1/fission-all-1.4.1.tgz

Install also fission-cli (see instructions after installing fission)

$ sudo yum install zip

Then

$ ./installfunc.sh folder/
