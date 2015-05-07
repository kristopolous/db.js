//
// db.js Javascript Database 
// https://github.com/kristopolous/db.js
//
// Copyright 2011 - 2014, Chris McKenzie
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

    // type checking system
    _ = {
      // from underscore.js {
      isFun: function(obj) { return !!(obj && obj.constructor && obj.call && obj.apply) },
      isStr: function(obj) { return !!(obj === '' || (obj && obj.charCodeAt && obj.substr)) },
      isNum: function(obj) { return toString.call(obj) === '[object Number]' },
      isArr: [].isArray || function(obj) { return toString.call(obj) === '[object Array]' },
      isBool: function(obj){
        return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
      },
      // } end underscore.js
      // from jquery 1.5.2's type
      isObj: function( obj ){
        if(_.isFun(obj) || _.isStr(obj) || _.isNum(obj) || _.isArr(obj)) {
          return false;
        }
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
        ) {};

        return i;
      },

    keys = ({}).keys || function (obj) {
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

    // each is a complex one
    each = [].forEach ?
      function (obj, cb) {
        // Try to return quickly if there's nothing to do.
        if (obj.length === 0) { return; }
        if (_.isArr(obj)) { 
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

    if(which.length == 2) {
      ret[which[0]] = which[1];
      return ret;
    }

    if(which.length == 1) {
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
    obj.__trace__ = {};

    each(obj, function(key, value) {
      if(_.isFun(value)) {
        obj.__trace__[key] = value;
        obj[key] = function() {
          console.log([key + ":" ].concat(slice.call(arguments)));
          if(cb) { cb.apply(this, arguments); }
          return obj.__trace__[key].apply(this, arguments);
        }
      }
    });
  }

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

    for(var ix = 0, len = list.length; ix < len; ix++) {
      list[ix].constructor('i', _stainID);
    }
  }

  function isStained(obj) {
    return obj.constructor('i') == _stainID;
  }

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
      set = copy(_.isArr(this) ? this : filterList.shift());

    if( filterList.length == 2 && _.isStr( filterList[0] )) {
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
        // If we just pass the inner array, this would be wrong because
        // then it would operate as an AND so we need to do things individually.
        var 
          result = [], 
          remaining = set;

        // TODO: this feels wrong.
        if (filter.length === 0) {
          set = remaining;
        } else {

          // Wanting to do DB.find(['field1', 'field2'], condition) 
          // seems convenient enough.
          if(
            !_.isObj(filter[0]) &&
            filterList.length == 2
          ) {
            var _condition = filterList.pop();
            filter = map(filter, function(row) {
              return obj(row, _condition);
            });
          }
       
          for(ix = 0; ix < filter.length; ix++) {
            result = result.concat(find(remaining, filter[ix]));
            remaining = setdiff(remaining, result);
          }

          set = result;
        }
      } else if(_.isFun(filter)) {
        var callback = filter;

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
        compare = len == 1 ? param1 : (param2 || []),
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

      if(len == 2) {
        obj = {};
        obj[param1] = callback;
        return obj;
      } else {
        return callback;
      }
    }
  })();

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

    if(len == 1) {
      query = param1;
    } else if(len == 2){
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
          if(arguments.length == 1) {
            if(!cache[expr]) {

              try {
                ret = new Function("x,rec", "try { return x " + expr + "} catch(e) {}");
              } catch(ex) {
                ret = false;
              }

              if(!ret) {
                try {
                  ret = new Function("rec", "try { return " + arg0 + "} catch(e) {}");
                } catch(ex) {}
              }

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
                cache[expr] = new Function("x,rec", "try { return x " + expr + "} catch(e) {}");
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
      context = 0,
      ret = [],
      filter;

    if(arguments.length == 2) {
      filter = callback;
      callback = arg1;
    } else {
      filter = this;
    }

    if(_.isArr(filter)) {
      ret = mapSoft(filter, callback);
    } else {
      ret = {};

      if(_.isArr(callback)) {
        context = callback[0];
        callback = callback[1];
      }

      for(var key in filter) {
        if(!_.isFun(filter[key])) {
          ret[key] = callback.call(context, filter[key]);
        }
      }
    } 

    return ret;
  }

  // the list of functions to chain
  var chainList = hash([
    'each',
    'find',
    'findFirst',
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

      list.first = list[0];
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
      not: not,
    
      // This is a shorthand to find for when you are only expecting one result.
      // A boolean false is returned if nothing is found
      findFirst: function(){
        var res = ret.find.apply(this, arguments);
        return res.length ? res[0] : false;
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

      map: eachRun,

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
        var list = update.apply( _.isArr(this) ? this : ret.find(), arguments) ;
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
          each(which[field], function(what) {
            // if it's an array, then we do each one.

            if(! (what in groupMap) ) {
              groupMap[what] = chain([]);
            }

            groupMap[what].push(which);
          });
        }
      });
      
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
    // lazyView
    //
    // lazyViews are a variation of views that have to be explicitly rebuilt
    // on demand with ()
    //
    ret.lazyView = function(field, type) {
      // keep track
      var 
        myix = {del: _ix.del, ins: _ix.ins},
        keyer;
      
      if(field.charAt(0) !== '[' || field.charAt(0) !== '.') {
        field = '.' + field;
      }

      eval( "keyer = function(r,ref){try{ref[rX] = update[rX] = r;} catch(x){}}".replace(/X/g, field));

      function update(whence) {
        if(whence) {
          // if we only care about updating our views
          // on a new delete, then we check our atomic
          if(whence == 'del' && myix.del == _ix.del) {
            return;
          } else if(whence == 'ins' && myix.ins == _ix.ins) {
            return;
          }
        }
        myix = {del: _ix.del, ins: _ix.ins};

        var ref = {};

        each(raw, function(row) {
          keyer(row, ref);
        });

        for(var key in update) {
          if( ! (key in ref) ) {
            delete update[key];
          }
        }
      }

      update();
      return update;
    },

    //
    // view 
    //
    // Views are an expensive synchronization macro that return 
    // an object that can be indexed in order to get into the data.
    //
    ret.view = function(field, type) {
      var fn = ret.lazyView(field, type);
      ret.sync(fn);
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
            _g[key]('del');
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

        try {
          data = new (secret(ix))();
          extend(data, which);
          which = data;
        } catch(ex) {

          // Embedded objects, like flash controllers
          // will bail on extend because the properties 
          // aren't totally enumerable.  We work around 
          // that by slightly changing the object;
          // hopefully in a non-destructive way.
          which.constructor = secret(ix);
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
      else if(arguments.length > 0){ list = ret.find.apply(this, arguments); } 
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
    
    // Register this instance.
    DB.all.push(ret);

    return ret;
  }

  extend(DB, {
    all: [],
    find: find,
    diff: setdiff,
    each: eachRun,
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

    findFirst: function(){
      var res = find.apply(this, arguments);
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
