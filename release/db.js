//
// db.js Javascript Database 
// https://github.com/kristopolous/db.js
//
// Copyright 2011 - 2015, Chris McKenzie
// Dual licensed under the MIT or GPL Version 2 licenses.
//
// Looking under the hood are you? What a fun place to be.
//
// Let's break this down:
//
// 1. since there are no dependencies, I have to have nice
//    underscore and jquery like things myself.
//
// 2. A few database specific tricks.
//
// 3. Trace and debug handlers
//
// 4. Now we get into the core top level functions. These
//    run agnostic of a specific database and work
//    holistically. They include things like find.
//
// 5. The database instance.
//
// 6. Finally a hook that exposes the internal functions
//    outward, plus a few other inline ones that don't get
//    used internally.
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
    _stainKey = '_4ab92bf03191c585f182',

    // type checking system
    _ = {
      // from underscore.js {
      isFun: function(obj) { return !!(obj && obj.constructor && obj.call && obj.apply) },
      isStr: function(obj) { return !!(obj === '' || (obj && obj.charCodeAt && obj.substr)) },
      isNum: function(obj) { return toString.call(obj) === '[object Number]' },
      isUndef: function(obj) { return isNaN(obj) || (obj === null) || (obj === undefined) },
      isScalar: function(obj) { return _.isStr(obj) || _.isNum(obj) || _.isBool(obj) },
      isArr: [].isArray || function(obj) { return toString.call(obj) === '[object Array]' },
      isBool: function(obj){
        return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
      },
      // } end underscore.js
      // from jquery 1.5.2's type
      isObj: function( obj ){
        if(_.isFun(obj) || _.isStr(obj) || _.isNum(obj) || _.isArr(obj)) {
          return false;
        }
        return obj == null ? 
          String( obj ) === 'object' : 
          toString.call(obj) === '[object Object]' || true ;
      }
    },

    proxy = function(what, caller) {
      return function() {
        caller.apply(what, slice.call(arguments));
      }
    },

    // functions that may have native shortcuts
    indexOf = [].indexOf ? 
      function(array, item) { 
        return array.indexOf(item) 
      } :

      function(array, item) {
        for(var i = array.length - 1; 
          (i !== -1) && (item !== array[i]);
          i--
        ) {};

        return i;
      },

    keys = Object.keys || function (obj) {
      var ret = [];

      for(var key in obj) {
        ret.push(key);
      }

      return ret;
    },

    values = function (obj) {
      var ret = [];

      for(var key in obj) {
        ret.push(obj[key]);
      }

      return ret;
    },

    obj = function(key, value) {
      var ret = {};
      ret[key] = value;
      return ret;
    },

    mapSoft = function(array, cb) {
      'use strict';
      var ret = [];

      for ( var i = 0, len = array.length; i < len; i++ ) { 
        ret.push(cb(array[i], i));
      }

      return ret;
    },

    map = [].map ?
      function(array, cb) { 
        return array.map(cb) 
      } : mapSoft,

    _filterThrow = function(fun/*, thisArg*/) {
      'use strict';

      var len = this.length; 
      for (var i = 0; i < len; i++) {
        if (fun(this[i])) {
          throw this[i];
        }
      }
      return [];
    },

    _filter = function(fun/*, thisArg*/) {
      'use strict';

      var len = this.length, start = 0, res = [];

      for (var i = 0; i < len; i++) {
        if (!fun(this[i])) {
          if(start !== i) {
            //res = res.concat(this.slice(start, i));
            res.splice.apply(res, [i,i].concat(this.slice(start, i)));
          }
          start = i + 1;
        }
      }
      if(start !== i) {
        res.splice.apply(res, [i,i].concat(this.slice(start, i)));
      }

      return res;
    },

    // each is a complex one
    each = [].forEach ?
      function (obj, cb) {
        'use strict';
        // Try to return quickly if there's nothing to do.
        if (_.isArr(obj)) { 
          if(obj.length === 0) { return; }
          obj.forEach(cb);
        } else if(_.isStr(obj) || _.isNum(obj) || _.isBool(obj)) {
          cb(obj);
        } else {
          for( var key in obj ) {
            cb(key, obj[key]);
          }
        }
      } :

      function (obj, cb) {
        // Try to return quickly if there's nothing to do.
        if (obj.length === 0) { return; }
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
   
  // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
  function escapeRegExp(string){
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // This is from underscore. It's a <<shallow>> object merge.
  function extend(obj) {
    'use strict';
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  }

  function kvarg(which){
    var ret = {};

    if(which.length === 2) {
      ret[which[0]] = which[1];
      return ret;
    }

    if(which.length === 1) {
      return which[0];
    }
  }

  function hash(array) {
    var ret = {};

    each(array, function(index) {
      ret[index] = true;
    });

    return ret;
  }

  // We create basic comparator prototypes to avoid evals
  each('< <= > >= == === != !=='.split(' '), function(which) {
    _compProto[which] = Function(
      'rhs',
      'return function(x){return x' + which + 'rhs}'
    )
  });

  function trace(obj, cb) {
    // if no parameters are provided, then trace all the 
    // databases from this point onward.
    if(!obj || _.isBool(obj)) {
      trace.active = (arguments.length === 0) ? !trace.active : obj;
      if(cb) {
        trace.cb = cb;
      }
      return trace.active;
    }
    // This prevents trace from being called on
    // one object twice, which would lead to infinite
    // recursion.
    if(obj.__trace__) {
      return;
    }

    obj.__trace__ = {};
    var level = 0;

    each(obj, function(func, value) {
      if(_.isFun(value)) {
        obj.__trace__[func] = value;

        obj[func] = function() {
          level ++;

          var 
            args = slice.call(arguments), 
            log = [func].concat(args);

          if(cb) { 
            cb({
              "this": this, 
              "args": args,
              "func": func,
              "level": level
            }); 
          } else {
            // trying to desperately make useful output
            trace.l %= 500;
            console.log(trace.l, log);
            trace[trace.l++] = log;
          }

          var res = obj.__trace__[func].apply(this, args);

          level --;
          return res;
        }
      }
    });
  }
  trace.l = 0;
  trace.active = false;

  function copy(obj) {
    // we need to call slice for array-like objects, such as the dom
    return 'length' in obj ? slice.call(obj) : values(obj);
  }

  // These function accept index lists.
  function setdiff(larger, subset) {
    var ret = [];

    stain(subset);

    for(var ix = 0, len = larger.length; ix < len; ix++) {
      if (isStained(larger[ix])) { 
        unstain(larger[ix]);
        continue;
      } 
      ret.push(larger[ix]);
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

    each(list, function(el) {
      el[_stainKey] = _stainID;
    });
  }

  function unstain(obj) {
    delete obj[_stainKey];
  }

  function isStained(obj) {
    return obj[_stainKey] === _stainID;
  }

  // The first parameter, if exists, is assumed to be the value in the database,
  // which has a content of arrays, to search.
  // The second parameter is the index to search
  function has(param1, param2) {
    var 
      len = arguments.length,
      compare = len === 1 ? param1 : param2,
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

    if(len === 2) {
      obj = {};
      obj[param1] = callback;
      return obj;
    } else {
      return callback;
    }
  }

  function find() {
    var 
      filterList = slice.call(arguments),
      filter,
      filterIx,
      filterComp,

      which,
      val,

      // The indices
      ix,

      // The dataset to compare against
      set = (_.isArr(this) ? this : filterList.shift());

    if( filterList.length === 2 && _.isStr( filterList[0] )) {
      // This permits find(key, value)
      which = {};
      which[filterList[0]] = filterList[1];
      filterList = [which];
    } 

    for(filterIx = 0; filterIx < filterList.length; filterIx++) {
      filter = filterList[filterIx];

      // if we are looking at an array, then this acts as an OR, which means
      // that we just recursively do this.
      if(_.isArr(filter)) {
        // If there are two arguments, and the first one isn't a function
        if(_.isScalar(filter[0]) && filterList.length === 2) {
          var 
            filterComp_len,
            filterkey_list = filter, 
            // remove it from the list so it doesn't get
            // a further comprehension
            filterkey_compare = filterList.pop();

          filterComp = [function(row) {
            for(var ix = 0; ix < filterkey_list.length; ix++) {
              if(equal(row[filterkey_list[ix]], filterkey_compare)) {
                return true;
              }
            }
          }]
        } else {
          filterComp = map(filter, expression());
        }
        //self.fComp = filterComp;
        //console.log(filterComp);
        
        filterComp_len = filterComp.length;
        set = _filter.call(set, function(row) {
          // this satisfies the base case.
          var ret = true;
          for (var ix = 0; ix < filterComp_len; ix++) {
            if(filterComp[ix](row)) {
              return true;
            }
            ret = false;
          }
          return ret;
        });
      } else if(_.isFun(filter)) {
        set = _filter.call(set, filter);
      } else {
        each(filter, function(key, value) {
          // this permits mongo-like invocation
          if( _.isObj(value)) {
            var 
              _key = keys(value)[0],
              _fn = _key.slice(1);

            // see if the routine asked for exists
            if(_fn in DB) {
              value = DB[_fn](value[_key]);
            } else {
              throw new Error(_fn + " is an unknown function");
            }
          } else if( _.isArr(value)) {
          // a convenience isin short-hand.
            value = isin(value);
          }

          if( _.isFun(value)) {
            filterComp = function(which) {
              // Check for existence
              if( key in which ) {
                val = which[key];

                // Permit mutator events
                if( _.isFun(val) ) { val = val(); }

                return value(val, which);
              }
            }
          } else {
            filterComp = function(which) {
              val = which[key];

              if( _.isFun(val) ) { val = val(); }

              // Check for existence
              return (key in which && val === value );
            };
          }
          set = _filter.call(set, filterComp);
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
  function missing(arg) {
    var fieldList = hash(arg);

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

    // todo: typecheck each element and then extract functions 
    return function (param1, param2) {
      var 
        callback,
        len = arguments.length,
        compare = len === 1 ? param1 : (param2 || []),
        dynamicList = [],
        staticList = [],
        obj = {};

      // If the second argument is an array then we assume that we are looking
      // to see if the value in the database is part of the user supplied funciton
      if(!_.isArr(compare)) {
        throw new TypeError("isin's argument is wrong. ", compare);
      }
      if(compare.length){
        each(compare, function(what) {
          if(_.isFun(what)) {
            dynamicList.push(what);
          } else {
            staticList.push(what);
          }
        });

        callback = function(x) { 
          var res = indexOf(staticList, x) > -1; 
          for(var ix = 0; ix < dynamicList.length; ix++) {
            if(res) { break; }
            res = dynamicList[ix](x);
          }
          return res;
        };
      } else if (_.isFun(compare)) {
        callback = function(x) { return indexOf(compare(), x) > -1; };
      } else {
        callback = compare;
      }

      if(len === 2) {
        obj = {};
        obj[param1] = callback;
        return obj;
      } else {
        return callback;
      }
    }
  })();

  function equal(lhs, rhs) {
    // If they are strictly equal or
    return (lhs === rhs) || (
        // if it's a function and using the parameter of
        // lhs makes the rhs function return true
           (_.isFun(rhs) && rhs(lhs))
        // or if they are arrays and equal
        || !_.isUndef(lhs) && (
            (lhs.join && rhs.join) &&
            (lhs.sort().toString() === rhs.sort().toString())
          ) 
        || (JSON.stringify(lhs) === JSON.stringify(rhs))
      );
  }
  function isArray(what) {
    var asString = what.sort().join('');
    return function(param) {
      return param.sort().join('') === asString;
    }
  }

  function like(param1, param2) {
    var 
      compare,
      len = arguments.length,
      query,
      queryRE,
      obj = {};

    if(len === 1) {
      query = param1;
    } else if(len === 2){
      query = param2;
    } 

    query = query.toString();

    compare = function(x) { 
      if(x === null) {
        return false;
      }

      try {
        queryRE = new RegExp(query, 'img');
      } catch (ex) {
        queryRE = new RegExp(escapeRegExp(query), 'img');
      }

      return x.toString().search(queryRE) > -1;
    }

    if(len === 2) {
      obj = {};
      obj[param1] = compare;
      return obj;
    } else {
      return compare;
    }
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
      // {a: blah, b: blah}
      each(arg0, function(key, value) {
        // {a: function(){ return }}
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

  function not( lambda ) {
    return function() {
      return !lambda.apply(this, arguments);
    }
  }

  var _fCache = {}, _eCache = {};
  function ewrap(arg, str) {
    var key = str + ":" + arg;
    if(!(key in _eCache)) {
      try {
        _eCache[key] = eval('(function(' + arg +'){' + str + '})');
      } catch(ex) {
        _eCache[key] = false;
      }
    }
    return _eCache[key];
  }

  function fwrap(arg, str) {
    var key = str + ":" + arg;
    if(!(key in _fCache)) {
      try {
        _fCache[key] = new Function(arg, "try{return " + str + "}catch(e){}");
      } catch(ex) {
        _fCache[key] = false;
      }
    }
    return _fCache[key];
  }

  var expression = function () {

    return function(arg0, arg1) {
      var ret, expr;

      if(_.isStr( arg0 )) {
        expr = arg0;

        //
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
        // expressive usage.
        //
        if(arguments.length === 2 && _.isStr(arg1)) {
          expr = arg1;
          ret = fwrap("x,rec", "x." + arg0 + expr);

          // if not, fall back on it 
          ret[arg0] = fwrap("x,rec", "x " + expr);
        } else {
          ret = fwrap("x,rec", "x " + expr);

          if(!ret) {
            ret = fwrap("rec", arg0);
          }
        }

        return ret;
      } else if (_.isObj( arg0 )) {

        var 
          cList = [], 
          val;
        for(var key in arg0) {
          if(_.isScalar(arg0[key])) {
            val = arg0[key];
            if(_.isStr(val)) {
              val = '"' + val + '"';
            }
            cList.push("rec['" + key + "']===" + val);
          } else {
            cList.push("equal(rec['" + key + "'],arg0['" + key + "'])");
          }
        };

        return ewrap('rec', 'return ' + cList.join('&&'));
      }
    }
  }

  function eachRun(callback, arg1) {
    var 
      context = 0,
      ret = [],
      filter;

    if(arguments.length === 2) {
      filter = callback;
      callback = arg1;
    } else {
      filter = _.isArr(this) ? this : this.find();
    }

    if(_.isArr(callback) && callback.length === 2) {
      context = callback[0];
      callback = callback[1];
    }

    if(_.isArr(filter)) {
      ret = mapSoft(filter, callback);
    } else {
      ret = {};

      for(var key in filter) {
        if(!_.isFun(filter[key])) {
          ret[key] = callback.call(context, filter[key]);
        }
      }
    } 

    return ret;
  }

  // The list of functions to chain
  var chainList = hash([
    'distinct',
    'each',
    'find',
    'findFirst',
    'first',
    'group',
    'has',
    'hasKey',
    'indexBy',
    'insert',
    'invert',
    'isin',
    'keyBy',
    'lazyView',
    'like',
    'missing',
    'order',
    'orderBy',
    'remove',
    'schema',
    'select',
    'slice',
    'sort',
    'unset',
    'update',
    'view',
    'where'
  ]);

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
      constraints = {addIf:[]},
      constrainCache = {},
      syncList = [],
      syncLock = false,
      //
      // This is our atomic counter that
      // gets moved forward for different
      // operations
      //
      _ix = {ins:0, del:0},
      _template = false,
      ret = expression(),

      // globals with respect to this self.
      _g = {},
      raw = [];

    function sync() {
      if(!syncLock) {
        syncLock = true;
        each(syncList, function(which) { which.call(ret, raw); });
        syncLock = false;
      }
    }

    function chain(list) {
      for(var func in chainList) {
        list[func] = ret[func];
      }

      list.last = list[list.length - 1];

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

      slice: function() {
        var filter = _.isArr(this) ? this : ret.find()

        return(chain( slice.apply(filter, arguments) ) );
      },

      transaction: {
        start: function() {
          syncLock = true;
        },
        end: function(){
          // Have to turn the syncLock off prior to attempting it.
          syncLock = false;
          sync();
        }
      },

      // This isn't a true schema derivation ... it's a spot check
      // over the data-set to try to show a general schema ... since
      // this is essentially a schema-less document store there could
      // be things missing.
      //
      schema: function() {
        // rand() is slow on android (2013-01) and the entropy 
        // can have some issues so we don't try doing that.
        // The interwebs claims that every 10th sampling is a good
        // way to roll, so let's do that.
        //
        // Js perf says a trivial double for is the way to roll
        // with a very slight edge for caching ... although this
        // makes no sense whatsoever.
        var 
          agg = {}, 
          list = _.isArr(this) ? this : ret.find(),
          len = list.length, 
          skip = Math.ceil(Math.min(10, len / 3)),
          entry;

        for(var i = 0; i < len; i += skip ) {
          entry = list[i];

          for(var key in entry) {
            agg[key] = _u;
          }
        }

        return keys(agg);
      },

      // 
      // This is to constrain the database.  Currently you can enforce a unique
      // key value through something like `db.constrain('unique', 'somekey')`.
      // You should probably run this early, as unlike in RDBMSs, it doesn't do
      // a historical check nor does it create a optimized hash to index by
      // this key ... it just does a lookup every time as of now.
      //
      constrain: function() { 
        extend(constraints, kvarg(arguments)); 
      },
      
      // Adds if and only if a function matches a constraint
      addIf: function( lambda ) {
        if(lambda) {
          constraints.addIf.push(lambda);
        }
        return constraints.addIf;
      },

      // beforeAdd allows you to mutate data prior to insertion.
      // It's really an addIf that returns true
      beforeAdd: function( lambda ) {
        return ret.addIf(
          lambda ? 
              function() { lambda.apply(0, arguments); return true; } 
            : false
          )
      },

      unset: function(key) {
        if(_.isArr(key)) {
          return each(key, arguments.callee);
        } else {
          var list = _.isArr(this) ? this : ret.find();
          each(list, function(what) {
            if(key in what) {
              delete what[key];
            }
          });
          sync();
          return chain(list);
        }
      },

      each: eachRun,
      isFunction: _.isFun,
      isString: _.isStr,
      map: eachRun,
      not: not,
    
      // This is a shorthand to find for when you are only expecting one result.
      // A boolean false is returned if nothing is found
      findFirst: function(){
        var 
          realFilter = _filter, 
          matched = false,
          res;
        _filter = _filterThrow;
        try { 
          res = ret.find.apply(this, arguments);
        } catch(ex) {
          res = ex;
          matched = true;
        }
        _filter = realFilter;

        // If we matched, then we did an assignment,
        // otherwise we can assume that we got an array back.
        return matched ? res : (res.length ? res[0] : false);
      },

      has: has,

      // hasKey is to get records that have keys defined
      hasKey: function() {
        var 
          outer = _.isArr(this) ? this : this.find(),
          inner = outer.find(missing(slice.call(arguments)));

        return this.invert(inner, outer);
      },

      isin: isin,
      like: like,
      invert: function(list, second) { return chain(setdiff(second || raw, list || this)); },

      // Missing is to get records that have keys not defined
      missing: function() { 
        var base = missing(slice.call(arguments));
        return _.isArr(this) ? this.find(base) : base;
      },

      // The callbacks in this list are called
      // every time the database changes with
      // the raw value of the database.
      //
      // Note that this is different from the internal
      // definition of the sync function, which does the
      // actual synchronization
      sync: function(callback) { 
        if(callback) {
          syncList.push(callback);
        } else { 
          sync();
        }
        return ret;
      },

      template: function(opt) {
        _template = opt; 
        return ret; 
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
        var list = update.apply( _.isArr(this) ? this : ret.find(), arguments) ;
        sync();
        return chain (list);
      }

    });

    extend(ret.template, {
      create: ret.template,
      update: function(opt) { extend(_template || {}, opt); return ret; },
      get: function() { return _template },
      destroy: function() { _template = false; return ret; }
    });

    ret.first = ret.findFirst;

    //
    // group
    //
    // This is like SQLs groupby function. It will take results from any other function and then
    // return them as a hash where the keys are the field values and the results are an array
    // of the rows that match that value.
    //
    ret.group = function() {
      var 
        args = slice.call(arguments || []),
        field = args.shift(),
        groupMap = {},
        filter = _.isArr(this) ? this : ret.find();                 

      each(filter, function(which) {
        // undefined is a valid thing.
        var entry = (field in which) ? which[field] : [undefined];
        each(entry, function(what) {
          // if it's an array, then we do each one.

          if(! (what in groupMap) ) {
            groupMap[what] = chain([]);
          }

          groupMap[what].push(which);
        });
      });

      if(args.length) {
        each(groupMap, function(key, value) {
          groupMap[key] = ret.group.apply(value, args);
        });
      }
      
      return groupMap;
    } 

    //
    // keyBy
    //
    // This is like group above but it just maps as a K/V tuple, with 
    // the duplication policy of the first match being preferred.
    //
    ret.keyBy = function(field) {
      var groupResult = ret.group.apply(this, arguments);

      each(groupResult, function(key, value) {
        groupResult[key] = value[0];
      });

      return groupResult;
    } 

    //
    // distinct
    //
    // get an array of the distinct values for a particular key.
    //
    ret.distinct = function(field) {
      return keys(ret.keyBy(field));
    }

    //
    // indexBy is just a sort without a chaining of the args
    //
    ret.indexBy = function () {
      // alias chain away
      var _chain = chain; 

      // make chain a dummy function
      chain = function(m) { return m; }

      // set the order output to the raw
      ret.__raw__ = raw = ret.order.apply(this, arguments);

      // and then re-assign chain back to the proper place
      chain = _chain; 
    }

    //
    // sort
    //
    // This is like SQLs orderby function.  If you pass it just a field, then
    // the results are returned in ascending order (x - y).  
    //
    // You can also supply a second parameter of a case insensitive "asc" and "desc" like in SQL.
    //
    ret.order = ret.sort = ret.orderBy = function (arg0, arg1) {
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

        if(len === 1) {
          order = 'x-y';
        } else if(len === 2) {

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

      // Addresses test 23 (Finding: Find all elements cascaded, 3 times)
      if(!_.isArr(this)) {
        args = [raw].concat(args);
      }

      return chain( find.apply(this, args) );
    }

    //
    // lazyView
    //
    // lazyViews are a variation of views that have to be explicitly rebuilt
    // on demand with ()
    //
    ret.lazyView = function(field, type) {
      // keep track
      var 
        myix = {del: _ix.del, ins: _ix.ins},
        res = {},
        keyer;
      
      if(field.search(/[()]/) === -1) {
        if(field.charAt(0) !== '[' || field.charAt(0) !== '.') {
          field = '.' + field;
        }

        eval( "keyer = function(r,ref){try{ref[rX] = res[rX] = r;} catch(x){}}".replace(/X/g, field));
      } else {
        eval( "keyer = function(r,ref){with(r) { var val = X };try{ref[val] = res[val] = r;} catch(x){}}".replace(/X/g, field));
      }

      Object.defineProperty(res, 'update', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function(whence) {
          if(whence) {
            // if we only care about updating our views
            // on a new delete, then we check our atomic
            if(whence === 'del' && myix.del === _ix.del) {
              return;
            } else if(whence === 'ins' && myix.ins === _ix.ins) {
              return;
            }
          }
          myix = {del: _ix.del, ins: _ix.ins};

          var ref = {};

          each(raw, function(row) {
            keyer(row, ref);
          });

          for(var key in res) {
            if( ! (key in ref) && key != 'update') {
              delete res[key];
            }
          }

          Object.defineProperty(res, 'length', {
            enumerable: false,
            configurable: false,
            writable: true,
            value: Object.keys(res).length
          });
        }
      });

      res.update();
      return res;
    },

    //
    // view 
    //
    // Views are an expensive synchronization macro that return 
    // an object that can be indexed in order to get into the data.
    //
    ret.view = function(field, type) {
      var fn = ret.lazyView(field, type);
      ret.sync(fn.update);
      return fn;
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
        if(column === '*') {
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
        ix,
        unique = constraints.unique,
        existing = [],
        toInsert = [],
        ixList = [];

      //
      // Parse the args put in.  
      // 
      // If it's a comma seperated list then make the 
      // list to insert all the args
      if(arguments.length > 1) {
        toInsert = slice.call(arguments);

        // if it was an array, then just assign it.
      } else if (_.isArr(param)) {
        toInsert = param;

        // otherwise it's one argument and 
        // we just insert that alone.
      } else {
        toInsert = [param];
      } 

      each(toInsert, function(which) {
        // We first check to make sure we *should* be adding this.
        var doAdd = true, data;

        // If the unique field has been set then we do
        // a hash search through the constraints to 
        // see if it's there.
        if(unique && (unique in which)) {

          // If the user had opted for a certain field to be unique,
          // then we find all the matches to that field and create
          // a block list from them.
          var key = 'c-' + unique, map_;
          // We create a lazyView 
          if(!_g[key]) {
            _g[key] = ret.lazyView(unique);
          } else {
            // Only update if a delete has happened
            _g[key].update('del');
          }

          map_ = _g[key];

          // This would mean that the candidate to be inserted
          // should be rejected because it doesn't satisfy the
          // unique constraint established.
          if(which[unique] in map_){

            // Create a reference list so we know what was existing
            existing.push(map_[which[unique]]);

            // put on the existing value
            ixList.push(map_[which[unique]]);

            // Toggle our doAdd over to false.
            doAdd = false;
          } else {
            // Otherwise we assume it will be added and
            // put it in our map for future reference.
            map_[which[unique]] = which;
          }
        }

        each(constraints.addIf, function(test) {
          // Make sure that our candidate passes all tests.
          doAdd &= test(which);
        });

        if(!doAdd) {
          return;
        } 
        // if we got here then we can update 
        // our dynamic counter.
        _ix.ins++;

        // If we get here, then the data is going in.
        ix = raw.length;

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

        raw.push(which);

        ixList.push(ix);
      });

      sync();

      return extend(
        chain(list2data(ixList)),
        {existing: existing}
      );
    }

    // 
    // The quickest way to do an insert. 
    // This checks for absolutely nothing.
    //
    ret.flash = function(list) {
      ret.__raw__ = raw = raw.concat(list);
    }

    // trace self.
    ret.trace = function(cb) {
      DB.trace(ret, cb);
    }

    //
    // remove
    // 
    // This will remove the entries from the database but also return them if
    // you want to manipulate them.  You can invoke this with a constraint.
    //
    ret.remove = function(arg0, arg1) {
      var 
        isDirty = false,
        end, start,
        list,
        save = [];

      if(_.isArr(this)) { list = this; } 
      else if(_.isArr(arg0)) { list = arg0; } 
      else if(arguments.length > 0){ 
        save = ret.find.apply(this, arguments);
        if(save.length) {
          ret.__raw__ = raw = ret.invert(save);
          _ix.del++;
          sync();
        }
        return chain(save.reverse());
      } 

      else { list = ret.find(); }

      stain(list);

      for(var ix = raw.length - 1, end = raw.length; ix >= 0; ix--) {
        if (isStained(raw[ix])) { 
          unstain(raw[ix]);
          save.push(raw[ix]);
          continue;
        }
        if(end - (ix + 1)) {
          start = ix + 1;
          raw.splice(start, end - start);
          isDirty = true;
        }
        end = ix;
      }

      start = ix + 1;
      if(end - start) {
        raw.splice(start, end - start);
        isDirty = true;
      }

      if(isDirty) {
        // If we've spliced, then we sync and update our
        // atomic delete counter
        _ix.del++;
        sync();
      }
      return chain(save.reverse());
    }

    // The ability to import a database from somewhere
    if (arguments.length === 1) {
      if(_.isArr(arg0)) { ret.insert(arg0) }
      else if(_.isFun(arg0)) { ret.insert(arg0()) }
      else if(_.isStr(arg0)) { return ret.apply(this, arguments) }
      else if(_.isObj(arg0)) { 
        // This is so hokey...
        var fails = false;
        each(arg0, function(what, args) {
          if(!ret[what]) { fails = true }
          if(!fails) {
            ret[what](args); 
          }
        });
        if(fails) {
          ret.insert(arg0);
        }
      }
    } else if(arguments.length > 1) {
      ret.insert(slice.call(arguments));
    }

    // Assign this after initialization
    ret.__raw__ = raw;

    // we don't register this instance unless
    // we are tracing. The reason is because it's
    // convenient to use DB as a powerful filtering
    // syntax.  There shouldn't be a memory cost
    // for that convenience.
    if(trace.active) {
      ret.trace(trace.cb);
    }

    return ret;
  }

  extend(DB, {
    find: find,
    expr: expression(),
    diff: setdiff,
    each: eachRun,
    map: map,
    not: not,
    like: like,
    trace: trace,
    values: values,
    isin: isin,
    isArray: isArray,

    // like expr but for local functions
    local: function(){
      return '(function(){ return ' + 
        DB.apply(this, arguments).toString() + 
      ';})()';
    },

    // expensive basic full depth copying.
    copy: function(data) {
      return map(data, function(what) {
        return extend({}, what);
      });
    },

    objectify: function(keyList, values) {
      var obj = [];

      each(values, function(row) {
        var objRow = {};
        each(keyList, function(key, index) {
          objRow[key] = row[index];
        });

        obj.push(objRow);

      });

      return obj; 
    },

    // This does a traditional left-reduction on a list
    // as popular in list comprehension suites common in 
    // functional programming.
    reduceLeft: function(memo, callback) {
      if(arguments.length === 1) {
        callback = memo;
        memo = 0;
      }
      var lambda = _.isStr(callback) ? new Function("y,x", "return y " + callback) : callback;

      return function(list, opt) {
        var reduced = memo;

        for(var ix = 0, len = list.length; ix < len; ix++) {
          if(list[ix]) {
            reduced = lambda(reduced, list[ix], opt);
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
      if(arguments.length === 1) {
        callback = memo;
        memo = 0;
      }
      callback = DB.reduceLeft(memo, callback);

      return function(list) {
        return callback(list.reverse());
      }
    }
  });

})();
DB.__version__='0.0.2-reorg-43-g27139bd';
