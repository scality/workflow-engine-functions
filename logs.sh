#!/bin/sh
for i in `kubectl -n fission-function get pods | cut -d" " -f1`
do
    echo $i
    kubectl -n fission-function logs $i -c nodejs
done
