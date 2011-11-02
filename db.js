//
// db.js Javascript Database 0.0.1
// https://github.com/kristopolous/db.js
//
// Copyright 2011, Chris McKenzie
// Dual licensed under the MIT or GPL Version 2 licenses.
//
(function(){

  var 
    // undefined
    _u,

    // prototypes and short cuts
    slice = Array.prototype.slice,  
    toString = Object.prototype.toString,

    // system caches
    _orderCache = {},

    _compProto = {},

    // For computing set differences
    _stainID = 0,

    // type checking system
    _ = {
      // from underscore.js {
      isFun: function(obj) { return !!(obj && obj.constructor && obj.call && obj.apply) },
      isStr: function(obj) { return !!(obj === '' || (obj && obj.charCodeAt && obj.substr)) },
      isNum: function(obj) { return toString.call(obj) === '[object Number]' },
      isArr: [].isArray || function(obj) { return toString.call(obj) === '[object Array]' },
      // } end underscore.js
      // from jquery 1.5.2's type
      isObj: function( obj ){
        return obj == null ? 
          String( obj ) == 'object' : 
          toString.call(obj) === '[object Object]' || true ;
      }
    },

    // functions that may have native shortcuts
    indexOf = [].indexOf ? 
      function(array, item) { 
        return array.indexOf(item) 
      } :

      function(array, item) {
        for(var i = array.length - 1; 
          (i != -1) && (item != array[i]);
          i--
        );

        return i;
      },

    keys = ({}).keys || function (obj) {
      var ret = [];

      for(var key in obj) {
        ret.push(key);
      }

      return ret;
    },

    map = [].map ?
      function(array, cb) { 
        return array.map(cb) 
      } : 

      function(array, cb) {
        var ret = [];

        for ( var i = 0, len = obj.length; i < len; i++ ) { 
          ret.push(cb(obj[i], i));
        }

        return ret;
      },

    // each is a complex one
    each = [].forEach ?
      function (obj, cb) {
        if (_.isArr(obj)) { 
          obj.forEach(cb);
        } else {
          for( var key in obj ) {
            cb(key, obj[key]);
          }
        }
      } :

      function (obj, cb) {
        if (_.isArr(obj)) {
          for ( var i = 0, len = obj.length; i < len; i++ ) { 
            cb(obj[i], i);
          }
        } else {
          for( var key in obj ) {
            cb(key, obj[key]);
          }
        }
     };
   

  function hash(array) {
    var ret = {};

    each(array, function(index) {
      ret[index] = true;
    });

    return ret;
  }

  function print(arg) {
    if(_.isStr(arg)) {
      return '"' + arg.replace(/\"/g, '\\\"') + '"';
    } else if(_.isNum(arg)) {
      return arg;
    } else if(_.isArr(arg)) {
      return '[' + arg.map(function(param) { return print(param) }).join(',') + ']';
    }
  }

  // We create basic comparator prototypes to avoid evals
  each('< <= > >= == === != !=='.split(' '), function(which) {
    _compProto[which] = Function(
      'rhs',
      'return function(x){return x' + which + 'rhs}'
    )
  });

  // The first parameter, if exists, is assumed to be the value in the database,
  // which has a content of arrays, to search.
  // The second parameter is the index to search
  function has(param1, param2) {
    var 
      len = arguments.length,
      compare = len == 1 ? param1 : param2,
      callback,
      obj = {};

    if(_.isArr(compare)) {
      var len = compare.length;

      // This becomes O(N * M)
      callback = function(key) {
        for(var ix = 0; ix < len; ix++) {
          if (indexOf(key, compare[ix]) > -1) {
            return true;
          }
        }
        return false;
      }
    } else {
      // This is O(N)
      callback = function(key) {
        return indexOf(key, compare) > -1;
      }
    }

    if(len == 2) {
      obj = {};
      obj[param1] = callback;
      return obj;
    } else {
      return callback;
    }
  }

  function simplecopy(obj) {
    // we need to call slice for array-like objects, such as the dom
    return obj.length ? slice.call(obj) : values(obj);
  }

  function find() {
    var 
      filterList = slice.call(arguments),
      filter,
      filterIx,

      which,
      val,

      // The indices
      end,
      spliceix,
      ix,

      // The dataset to compare against
      set = simplecopy(_.isArr(this) ? this : filterList.shift());

    if( filterList.length == 2 && _.isStr( filterList[0] )) {
      // This permits find(key, value)
      which = {};
      which[filterList[0]] = filterList[1];
      filterList = [deepcopy(which)];
    } 

    for(filterIx = 0; filterIx < filterList.length; filterIx++) {
      filter = filterList[filterIx];

      if(_.isFun(filter)) {
        var callback = filter.single || filter;

        for(end = set.length, ix = end - 1; ix >= 0; ix--) {
          which = set[ix];
          if(!callback(which)) { continue }

          if(end - (ix + 1)) {
            spliceix = ix + 1;
            set.splice(spliceix, end - spliceix);
          }
          end = ix;
        }

        spliceix = ix + 1;
        if(end - spliceix) {
          set.splice(spliceix, end - spliceix);
        }
      } else {
        each(filter, function(key, value) {

          if( _.isFun(value)) {
            for(end = set.length, ix = end - 1; ix >= 0; ix--) {
              which = set[ix];

              // Check for existence
              if( key in which ) {
                val = which[key];

                // Permit mutator events
                if( _.isFun(val) ) { val = val(); }

                if( ! value(val, which) ) { continue }

                if(end - (ix + 1)) {
                  spliceix = ix + 1;
                  set.splice(spliceix, end - spliceix);
                }

                end = ix;
              }
            }

          } else {
            for(end = set.length, ix = end - 1; ix >= 0; ix--) {
              which = set[ix];

              val = which[key];

              if( _.isFun(val) ) { val = val(); }

              // Check for existence
              if( ! (key in which && val === value ) ) {
                continue;
              }

              if(end - (ix + 1)) {
                spliceix = ix + 1;
                set.splice(spliceix, end - spliceix);
              }
              end = ix;
            }
          }

          spliceix = ix + 1;
          if(end - spliceix) {
            set.splice(spliceix, end - spliceix);
          }
        });
      }
    }

    return set;
  }

  //
  // missing
  //
  // Missing is to get records that have keys not defined
  //
  function missing() {
    var fieldList = hash(slice.call(arguments));

    return function(record) {
      for(var field in fieldList) {
        if(field in record) {
          return false;
        }
      }
      return true;
    };
  }

  // 
  // isin
  //
  // This is like the SQL "in" operator, which is a reserved JS word.  You can invoke it either
  // with a static array or a callback
  var isin = (function() {
    // It has a cache for optimization
    var cache = {};

    return function (param1, param2) {
      var 
        callback,
        len = arguments.length,
        compare = len == 1 ? param1 : (param2 || []),
        obj = {};

      // If the second argument is an array then we assume that we are looking
      // to see if the value in the database is part of the user supplied funciton
      if(!_.isArr(compare)) {
        throw new TypeError("isin's argument is wrong. ", compare);
      }
      if(compare.length){
        if(compare.length < 20 && _.isNum(compare[0])) {
          var key = compare.join(',');

          // new Function is faster then eval but it's still slow, so we cache
          // the output of them and then pass them down the pipe if we need them
          // again
          if(! cache[key]) {
            callback = cache[key] = new Function('x', 'return x==' + compare.join('||x=='));
          } else {
            callback = cache[key];
          }
        } else {
          callback = function(x) { return indexOf(compare, x) > -1; };
        }
      } else if (_.isFun(compare)) {
        callback = function(x) { return indexOf(compare(), x) > -1; };
      } else {
        callback = compare;
      }

      if(len == 2) {
        obj = {};
        obj[param1] = callback;
        return obj;
      } else {
        return callback;
      }
    }
  })();

  function like(param1, param2) {
    var 
      compare,
      len = arguments.length,
      query,
      obj = {};

    if(len == 1) {
      query = param1;
    } else if(len == 2){
      query = param2;
    } 

    query = query.toString().toLowerCase();

    compare = function(x) { 
      return x.toString().toLowerCase().search(query) > -1; 
    }

    if(len == 2) {
      obj = {};
      obj[param1] = compare;
      return obj;
    } else {
      return compare;
    }
  }

  // An encapsulator for hiding internal variables
  function secret(x) {
    var cache = {x:x};

    return function(arg0, arg1){
      if (arguments.length == 2) { cache[arg0] = arg1; }
      return cache[arg0];
    };
  }

  function deepcopy(from) {
    // @http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-a-javascript-object
    return extend({}, from);
  }

  function list2obj(list) {
    var ret = {};

    each(list, function(which) {
      ret[which] = true;
    });

    return ret;
  }

  function values(obj) {
    var ret = [];

    for(var key in obj) {
      ret.push(obj[key]);
    }

    return ret;
  }

  // These function accept index lists.
  function setdiff(larger, subset) {
    var ret = [];

    stain(subset);

    for(var ix = 0, len = larger.length; ix < len; ix++) {
      if (isStained(larger[ix])) { 
        continue;
      } 
      ret.push(larger[ix]);
    }

    return ret;
  }

  function update(arg0, arg1) {
    var key, filter = this;

    // This permits update(key, value) on a chained find
    if( arg1 !== _u ) {

      // Store the key string
      key = arg0;

      // The constraint is actually the new value to be
      // assigned.
      arg0 = {};
      arg0[key] = arg1; 
    }

    if(_.isFun(arg0)) {
      each(filter, arg0);
    } else {
      each(arg0, function(key, value) {
        if(_.isFun( value )) {
          // take each item from the filter (filtered results)
          // and then apply the value function to it, storing
          // back the results
          each(filter, function(which) { 
            if(_.isFun(which[key])) {
              which[key]( value(which) );
            } else {
              which[key] = value(which); 
            }
          });
        } else {
          // otherwise, assign the static 
          each(filter, function(which) { 
            if(_.isFun(which[key])) {
              which[key]( value );
            } else {
              which[key] = value; 
            }
          });
        }
      });
    }

    return this;
  }

  // Jacked from Resig's jquery 1.5.2
  // The code has been modified to not rely on jquery and stripped
  // to not be so safe and general
  function extend(o1, o2) {
    var 
      options, src, copy, copyIsArray, clone,
      target = o1,
      len = arguments.length;

    for (var i = 0 ; i < len; i++ ) {
      // Only deal with non-null/undefined values
      options = arguments[ i ];

      // Extend the base object
      for (var name in options ) {
        src = target[ name ];
        copy = options[ name ];

        // Prevent never-ending loop
        if ( target === copy ) {
          continue;
        }

        // Recurse if we're merging plain objects or arrays
        if ( copy && ( copy.constructor == Object || (copyIsArray = (_.isArr(copy))) ) ) {
          if ( copyIsArray ) {
            copyIsArray = false;
            clone = src && (_.isArr(constructor)) ? src : [];
          } else {
            clone = src && (src.constructor == Object) ? src : {};
          }

          // Never move original objects, clone them
          target[ name ] = extend( clone, copy );

        // Don't bring in undefined values
        } else if ( copy !== _u ) {
          target[ name ] = copy;
        }
      }
    }
 
    // Return the modified object
    return target;
  }

  function kvarg(which){
    var ret = {};

    if(which.length == 2) {
      ret[which[0]] = which[1];
      return ret;
    }

    if(which.length == 1) {
      return which[0];
    }
  }

  var expression = (function(){
    var 
      regex = /^\s*([=<>!]+)['"]*(.*)$/,
      canned,
      cache = {};

    // A closure is needed here to avoid mangling pointers
    return function (){

      return function(arg0, arg1) {
        var ret, expr;

        if(_.isStr( arg0 )) {
          expr = arg0;
          // There are TWO types of lambda function here (I'm not using the
          // term 'closure' because that means something else)
          //
          // We can have one that is sensitive to a specific record member and 
          // one that is local to a record and not a specific member.  
          //
          // As it turns out, we can derive the kind of function intended simply
          // because they won't ever syntactically both be valid in real use cases.
          //
          // I mean sure, the empty string, space, semicolon etc is valid for both, 
          // alright sure, thanks smarty pants.  But is that what you are using? really?
          //
          // No? ok, me either. This seems practical then.
          //
          // The invocation wrapping will also make this work magically, with proper
          // expreessive usage.
          if(arguments.length == 1) {
            if(!cache[expr]) {

              try {
                ret = new Function("x,rec", "return x " + expr);
              } catch(ex) {
                ret = {};
              }

              try {
                ret.single = new Function("rec", "return " + arg0);
              } catch(ex) {}

              cache[expr] = ret;
            } else {
              ret = cache[expr];
            }
          }

          if(arguments.length == 2 && _.isStr(arg1)) {
            ret = {};
            expr = arg1;

            // See if we've seen this function before
            if(!cache[expr]) {

              // If we haven't, see if we can avoid an eval
              if((canned = expr.match(regex)) !== null) {
                cache[expr] = _compProto[canned[1]](canned[2].replace(/['"]$/, ''));
              } else {      
                // if not, fall back on it 
                cache[expr] = new Function("x,rec", "return x " + expr);
              }
            } 
            ret[arg0] = cache[expr];
          }

          return ret;
        } 
      }
    }
  })();

  function eachRun(callback, arg1) {
    var 
      ret = [],
      filter;

    if(arguments.length == 2) {
      filter = callback;
      callback = arg1;
    } else {
      filter = this;
    }

    if(_.isArr(filter)) {
      ret = map(filter, callback);
    } else {
      ret = {};

      for(var key in filter) {
        if(!_.isFun(filter[key])) {
          ret[key] = callback.call(this, filter[key]);
        }
      }
    } 

    return ret;
  }


  // 
  // "Staining" is my own crackpot algorithm of comparing
  // two unsorted lists of pointers that reference shared
  // objects. We go through list one, affixing a unique
  // constant value to each of the members. Then we go
  // through list two and see if the value is there.
  //
  // This has to be done rather atomically as the value
  // can easily be replaced by something else.  It's an
  // N + M cost...
  //
  function stain(list) {
    _stainID++;

    for(var ix = 0, len = list.length; ix < len; ix++) {
      list[ix].constructor('i', _stainID);
    }
  }

  function isStained(obj) {
    return obj.constructor('i') == _stainID;
  }

  // the list of functions to chain
  var chainList = list2obj('has hasKey insert invert missing isin group remove update where select find sort order each like'.split(' '));

  // --- START OF AN INSTANCE ----
  //
  // This is the start of a DB instance.
  // All the instance local functions
  // and variables ought to go here. Things
  // that would have been considered "static"
  // in a language such as Java or C++ should
  // go above!!!!
  //
  self.DB = function(arg0, arg1){
    var 
      constraints = {},
      constrainCache = {},
      syncList = [],
      bSync = false,
      _template = false,
      ret = expression(),
      raw = [];

    function sync() {
      if(!bSync) {
        bSync = true;
        each(syncList, function(which) { which.call(ret, raw); });
        bSync = false;
      }
    }

    function chain(list) {
      for(var func in chainList) {
        list[func] = ret[func];
      }

      return list;
    }

    function list2data(list) {
      var ret = [];

      for(var ix = 0, len = list.length; ix < len; ix++) {
        ret[ix] = raw[list[ix]];
      }

      return ret;
    }

    extend(ret, {

      // This is to constrain the database.  Currently you can enforce a unique
      // key value through something like `db.constrain('unique', 'somekey')`.
      // You should probably run this early, as unlike in RDBMSs, it doesn't do
      // a historical check nor does it create a optimized hash to index by
      // this key ... it just does a lookup every time as of now.
      constrain: function() { extend(constraints, kvarg(arguments)); },

      each: eachRun,
    
      // This is a shorthand to find for when you are only expecting one result.
      findFirst: function(){
        var res = ret.find.apply(this, slice.call(arguments));
        return res.length ? res[0] : {};
      },

      has: has,

      // hasKey is to get records that have keys defined
      hasKey: function() {
        return ret.find(missing.apply(this, slice.call(arguments))).invert();
      },

      isin: isin,
      like: like,
      invert: function(list) { return chain(setdiff(raw, list || this)); },

      map: eachRun,

      // Missing is to get records that have keys not defined
      missing: function() { 
        return ret.find(missing.apply(this, slice.call(arguments))); 
      },

      // The callbacks in this list are called
      // every time the database changes with
      // the raw value of the database.
      sync: function(callback) { 
        if(callback) {
          syncList.push(callback);
        } else { 
          sync();
        }
      },

      template: {
        create: function(opt) { _template = opt; },
        update: function(opt) { extend(_template || {}, opt); },
        get: function() { return _template },
        destroy: function() { _template = false }
      },

      // Update allows you to set newvalue to all
      // parameters matching constraint where constraint
      // is either a set of K/V pairs or a result
      // of find so that you can do something like
      //
      // Update also can take a callback.
      //
      //   var result = db.find(constraint);
      //   result.update({a: b});
      //
      update: function() {
        var list = update.apply( _.isArr(this) ? this : ret.find(), slice.call(arguments)) ;
        sync();
        return chain (list);
      }

    });

    //
    // group
    //
    // This is like SQLs groupby function. It will take results from any other function and then
    // return them as a hash where the keys are the field values and the results are an array
    // of the rows that match that value.
    //
    ret.group = function(field) {
      var 
        groupMap = {},
        filter = _.isArr(this) ? this : ret.find();                 

      each(filter, function(which) {
        if(field in which) {
          if(! groupMap[which[field]]) {
            groupMap[which[field]] = chain([]);
          }

          groupMap[which[field]].push(which);
        }
      });
      
      return groupMap;
    } 


    //
    // sort
    //
    // This is like SQLs orderby function.  If you pass it just a field, then
    // the results are returned in ascending order (x - y).  
    //
    // You can also supply a second parameter of a case insensitive "asc" and "desc" like in SQL.
    //
    ret.order = ret.sort = function (arg0, arg1) {
      var 
        key, 
        fnSort,
        len = arguments.length,
        order,
        filter = _.isArr(this) ? this : ret.find();                 

      if(_.isFun(arg0)) {
        fnSort = arg0;
      } else if(_.isStr(arg0)) {
        key = arg0;

        if(len == 1) {
          order = 'x-y';
        } else if(len == 2) {

          if(_.isStr(arg1)) {
            order = {
              'asc': 'x-y',
              'desc': 'y-x'
            }[arg1.toLowerCase()];
          } else {
            order = arg1;
          }
        }

        if(_.isStr(order)) {
          if(! _orderCache[order]) {
            order = _orderCache[order] = new Function('x,y', 'return ' + order);
          } else {
            order = _orderCache[order];
          }
        }

        eval('fnSort=function(a,b){return order(a.' + key + ', b.' + key + ')}');
      }

      return chain(slice.call(filter).sort(fnSort));
    }

    ret.where = ret.find = function() {
      var args = slice.call(arguments || []);

      // Addresses test 23 (Finding: Find all elements cascarded, 3 times)
      if(!_.isArr(this)) {
        args = [raw].concat(args);
      }

      return chain( find.apply(this, args) );
    }

    //
    // view 
    //
    // Views are an expensive synchronization macro that return 
    // an object that can be indexed in order to get into the data.
    //
    ret.view = function(field) {
      var obj = {};

      ret.sync(function(data) {
        var ref = {}, key;

        each(data, function(row) {
          if(field in row) {
            ref[row[field]] = row;
          }
        });

        for(key in ref) {
          if( ! ( key in obj ) ) {
            obj[key] = ref[key];
          } else if(obj[key] !== ref[key]) {
            obj[key] = ref[key];
          }
        }
        for(key in obj) {
          if( ! (key in ref) ) {
            delete obj[key];
          }
        }
      });

      sync();

      return obj;
    }


    //
    // select
    //
    // This will extract the values of a particular key from the filtered list
    // and then return it as an array or an array of arrays, depending on
    // which is relevant for the query.
    //
    // You can also do db.select(' * ') to retrieve all fields, although the 
    // key values of these fields aren't currently being returned.
    //
    ret.select = function(field) {
      var 
        filter = _.isArr(this) ? this : ret.find(),
        fieldCount,
        resultList = {};

      if(arguments.length > 1) {
        field = slice.call(arguments);
      } else if (_.isStr(field)) {
        field = [field];
      }

      fieldCount = field.length;
      
      each(field, function(column, iy) {
        if(column == '*') {
          resultList = map(filter, values);
        } else {
          for(var ix = 0, len = filter.length; ix < len; ix++) {
            row = filter[ix];

            if(column in row){
              if(fieldCount > 1) {
                if(!resultList[ix]) {
                  resultList[ix] = [];
                }
                resultList[ix][iy] = row[column];
              } else {
                resultList[ix] = row[column];
              }
            }
          }
        }
      });
      
      return chain(values(resultList));
    }

    // 
    // insert
    //
    // This is to insert data into the database.  You can either insert
    // data as a list of arguments, as an array, or as a single object.
    //
    ret.insert = function(param) {
      var 
        constraintMap = {},
        toInsert = [],
        ixList = [];

      if(arguments.length > 1) {
        toInsert = slice.call(arguments);
      } else if (_.isArr(param)) {
        toInsert = param;
      } else {
        toInsert.push(param);
      } 

      each(toInsert, function(which) {
        // If the unique field has been set then we do
        // a hash search through the constraints to 
        // see if it's there.
        if(constraints.unique) {
          // If the user had opted for a certain field to be unique,
          // then we find all the matches to that field and create
          // a block list from them.
          constraintMap = {};

          each(raw, function(data, index){
            constraintMap[data[constraints.unique]] = index;
          });

          if(which[constraints.unique] in constraintMap){
            // put on the existing value
            ixList.push(constraintMap[which[constraints.unique]]);
            return;
          }
        }

        var ix = raw.length, data;

        // insert from a template if available
        if(_template) {
          var instance = {};
          
          // create a template instance that's capable
          // of holding evaluations
          each(_template, function(key, value) {
            if(_.isFun(value)) {
              instance[ key ] = value();
            } else {
              instance[ key ] = value;
            }
          });

          // map the values to be inserted upon
          // the instance of this template
          which = extend(instance, which);
        }

        try {
          data = new (secret(ix))();
          extend(data, which);
          raw.push(data);
        } catch(ex) {

          // Embedded objects, like flash controllers
          // will bail on JQuery's extend because the
          // properties aren't totally enumerable.  We
          // work around that by slightly changing the 
          // object; hopefully in a non-destructive way.
          which.constructor = secret(ix);
          raw.push(which);
        }

        ixList.push(ix);
      });

      sync();

      return chain(list2data(ixList));
    }

    //
    // remove
    // 
    // This will remove the entries from the database but also return them if
    // you want to manipulate them.  You can invoke this with a constraint.
    //
    ret.remove = function(arg0, arg1) {
      var 
        end, start,
        list,
        save = [];

      if(_.isArr(this)) { list = this; } 
      else if(_.isArr(arg0)) { list = arg0; } 
      else if(arguments.length > 0){ list = ret.find.apply(this, slice.call(arguments)); } 
      else { list = ret.find(); }

      stain(list);

      for(var ix = raw.length - 1, end = raw.length; ix >= 0; ix--) {
        if (isStained(raw[ix])) { 
          save.push(raw[ix]);
          continue;
        }
        if(end - (ix + 1)) {
          start = ix + 1;
          raw.splice(start, end - start);
        }
        end = ix;
      }

      start = ix + 1;
      if(end - start) {
        raw.splice(start, end - start);
      }

      sync();
      return chain(save.reverse());
    }

    // The ability to import a database from somewhere
    if (arguments.length == 1) {
      if(_.isArr(arg0)) { ret.insert(arg0) }
      else if(_.isFun(arg0)) { ret.insert(arg0()) }
      else if(_.isStr(arg0)) { return ret.apply(this, arguments) }
      else if(_.isObj(arg0)) { ret.insert(arg0) }
    } else if(arguments.length > 1) {
      ret.insert(slice.call(arguments));
    }

    // Assign this after initialization
    ret.__raw__ = raw;
    return ret;
  }

  extend(DB, {
    find: find,
    each: eachRun,
    like: like,
    isin: isin,

    findFirst: function(){
      var res = find.apply(this, slice.call(arguments));
      return res.length ? res[0] : {};
    },

    // This does a traditional left-reduction on a list
    // as popular in list comprehension suites common in 
    // functional programming.
    reduceLeft: function(memo, callback) {
      var lambda = _.isStr(callback) ? new Function("y,x", "return y " + callback) : callback;

      return function(list) {
        var reduced = memo;

        for(var ix = 0, len = list.length; ix < len; ix++) {
          if(list[ix]) {
            reduced = lambda(reduced, list[ix]);
          }
        }

        return reduced;
      }
    },

    // This does a traditional right-reduction on a list
    // as popular in list comprehension suites common in 
    // functional programming.
    //
    reduceRight: function(memo, callback) {
      var callback = DB.reduceLeft(memo, callback);

      return function(list) {
        return callback(list.reverse());
      }
    }
  });

})();
