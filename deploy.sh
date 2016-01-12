#!/bin/bash
set +x
cp db.js db-tmp.js
cp db.min.js db-tmp.min.js
echo "DB.__version__='`git describe`';" >> db-tmp.js
./minifier.sh db-tmp
mv db-tmp.min.js db.min.js
rm db-tmp.js
./minifier.sh db-helper
