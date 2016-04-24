#!/bin/bash

for file in db db-helper; do
  cp src/$file.js release/$file.js
done

version=`git describe | awk -F '-' ' { print $1"."$(NF-1) } '`
age=`date +%Y%m%d`
fullversion=$version-$age
echo "DB.version='$fullversion';" >> release/db.js

cd release
for file in db db-helper; do
  ../tools/minifier.sh $file
done

echo $fullversion
