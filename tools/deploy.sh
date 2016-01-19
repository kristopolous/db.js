#!/bin/bash

for file in db db-helper; do
  cp src/$file.js release/$file.js
done

echo "DB.__version__='`git describe`';" >> release/db.js

cd release
for file in db db-helper; do
  ../tools/minifier.sh $file
done

