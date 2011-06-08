(function(){

  var 
    slice = Array.prototype.slice,  
    _unsafe = false,
    _speed = false,
    _orderCache = {},
    array = [];

  function each(obj, cb) {
    if (obj instanceof Array) {
      for ( var i = 0, len = obj.length; i < len; i++ ) cb(obj[i], i);
    } else {
      for(var key in obj) {
        cb(key, obj[key]);
      }
    }
  }

  var 
    type,
    typeMap = {},
    toString = Object.prototype.toString;

  each("Boolean Number String Function Array Date RegExp Object".split(' '), function(which) {
    typeMap[ "[object " + which + "]" ] = which.toLowerCase().charAt(0);
  });

  type = function( obj ) { 
    return obj == null ? 
      String( obj ) : 
      typeMap[ toString.call(obj) ] || "o" ;
  }

  // native fallback inspired from underscore.js
  var indexOf = array.indexOf ? 
    function(array, item) { return array.indexOf(item) } :
    function(array, item) {
      for(var i = array.length - 1; 
        (i != -1) && (item != array[i]);
        i--
      );

      return i;
    }

  // The first parameter, if exists, is assumed to be the value in the database,
  // which has a content of arrays, to search.
  // The second parameter is the index to search
  function has(param1, param2) {
    var 
      len = arguments.length,
      callback,
      comparator,
      obj = {};

    if(len == 1) {
      comparator = param1;
    } else if(len == 2){
      comparator = param2;
    } 

    if(type(comparator) == 'a') {
      var len = comparator.length;

      // This becomes O(N * M)
      callback = function(key) {
        for(ix = 0; ix < len; ix++) {
          if (indexOf(key, comparator[ix]) > -1) {
            return true;
          }
        }
        return false;
      }
    } else {
      // This is O(N)
      callback = function(key) {
        return indexOf(key, comparator) > -1;
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
    if(obj.length) {
      return obj.slice ? obj.slice() : slice.call(obj);
    } else {
      return values(obj);
    }
  }

  function find() {
    var 
      filterList = slice.call(arguments),
      filter,
      filterIx,

      which,

      internal = this instanceof Array;

    var end, spliceix, ix;
    // The dataset to compare against
    var set = simplecopy(internal ? this : filterList.shift());

    if( filterList.length == 2 && type( filterList[0] ) == 's') {
      // This permits find(key, value)
      which = {};
      which[filterList[0]] = filterList[1];
      filterList = [deepcopy(which)];
    } 

    for(filterIx = 0; filterIx < filterList.length; filterIx++) {
      filter = filterList[filterIx];
      if(type(filter) == 'f') {
        var callback = filter.single;

        for(end = set.length, ix = end - 1; ix >= 0; ix--) {
          if(!callback(set[ix])) continue;

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

          if( type(value) == 'f' ) {
            for(end = set.length, ix = end - 1; ix >= 0; ix--) {
              which = set[ix];

              // Check for existence
              if( key in which ) {
                if( !value(which[key], which) ) { continue }

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

              // Check for existence
              if( ! (key in which && which[key] === value ) ) continue;

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

  var isin = (function() {
    var cache = {};

    return function (param1, param2) {
      var 
        callback,
        len = arguments.length,
        comparator = len == 1 ? param1 : param2,
        obj = {};

      // If the second argument is an array then we assume that we are looking
      // to see if the value in the database is part of the user supplied funciton
      if(comparator.length){
        if(_unsafe && comparator.length < 10) {
          // This is totally unsafe
          var regex = new RegExp('^(' + comparator.join('|') + ')$');
          callback = function(x) { return regex.test(x); };
        } else if(comparator.length < 20) {
          var key = comparator.join(',');

          // new Function is faster then eval but it's still slow, so we cache
          // the output of them and then pass them down the pipe if we need them
          // again
          if(! cache[key]) {
            callback = cache[key] = new Function('x', 'return x==' + comparator.join('||x=='));
          } else {
            callback = cache[key];
          }
        } else {
          callback = function(x) { return indexOf(comparator, x) > -1; };
        }
      } else if (type(comparator) == 'f') {
        callback = function(x) { return indexOf(comparator(), x) > -1; };
      } else {
        callback = comparator;
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
      comparator,
      len = arguments.length,
      query,
      obj = {};

    if(len == 1) {
      query = param1;
    } else if(len == 2){
      query = param2;
    } 

    query = query.toString().toLowerCase();

    comparator = function(x) { return x.toString().toLowerCase().search(query) > -1; };

    if(len == 2) {
      obj = {};
      obj[param1] = comparator;
      return obj;
    } else {
      return comparator;
    }
  }

  // An encapsulator for hiding internal variables
  function secret() {
    var cache = {};
    return function(arg0,arg1){
      if (arguments.length == 1) { return cache[arg0];}
      if (arguments.length == 2) { cache[arg0] = arg1; }
    };
  }

  function deepcopy(from) {
    //@http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-a-javascript-object
    return extend(true, {}, from);
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

  var keys = Object.keys ? 
    Object.keys : 
    function (obj) {
      var ret = [];

      for(var key in obj) {
        ret.push(key);
      }

      return ret;
    }

  var obj2list = keys;


  function setdiff(larger, subset) {
    larger = list2obj(larger);
    subset = list2obj(subset);

    for(var key in subset) {
      if(larger[key]) {
        delete larger[key];
      }
    }

    return keys(larger);
  }
  // Jacked from Resig's jquery 1.5.2
  // The code has been modified to not rely on jquery
  function extend(bool, o1, o2) {
    var 
      options, name, src, copy, copyIsArray, clone,
      target = bool || {},
      i = 1,
      length = arguments.length,
      deep = false;

    // Handle a deep copy situation
    if ( type(target) == 'b' ) {
      deep = target;
      target = o1 || {};
      // skip the boolean and the target
      i = 2;
    }
 
    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && type( target ) !== 'f') {
      target = {};
    }
 
    // extend jQuery itself if only one argument is passed
    if ( length === i ) {
      target = this;
      --i;
    }
 
    for ( ; i < length; i++ ) {
      // Only deal with non-null/undefined values
      if ( (options = arguments[ i ]) != null ) {
        // Extend the base object
        for ( name in options ) {
          src = target[ name ];
          copy = options[ name ];
 
          // Prevent never-ending loop
          if ( target === copy ) {
             continue;
          }
 
          // Recurse if we're merging plain objects or arrays
          if ( deep && copy && ( copy.constructor == Object || (copyIsArray = (type(copy) == 'a')) ) ) {
            if ( copyIsArray ) {
              copyIsArray = false;
              clone = src && (type(constructor) == 'a') ? src : [];
            } else {
              clone = src && (src.constructor == Object) ? src : {};
            }
 
            // Never move original objects, clone them
            target[ name ] = extend( deep, clone, copy );
 
          // Don't bring in undefined values
          } else if ( copy !== undefined ) {
            target[ name ] = copy;
          }
        }
      }
    }
 
    // Return the modified object
    return target;
  };

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
    var cache = {};

    // A closure is needed here to avoid mangling pointers
    return function (){
      return function(arg0, arg1) {
        var ret, expr;

        if(type( arg0 ) == 's') {
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
                ret = new Function("x, record", "return x " + expr);
              } catch(ex) {
                ret = {};
              }

              try {
                ret.single = new Function("record", "return " + arg0);
              } catch(ex) {}

              cache[expr] = ret;
            } else {
              ret = cache[expr];
            }
          }

          if(arguments.length == 2 && type(arg1) == 's') {
            ret = {};
            expr = arg1;
            if(!cache[expr]) {
              cache[expr] = new Function("x, record", "return x " + expr);
            }
            ret[arg0] = cache[expr];
          }

          return ret;
        } 
      }
    }
  })();

  function eachApply(callback, arg1) {
    var 
      ret = [],
      filter;

    if(arguments.length == 2) {
      filter = callback;
      callback = arg1;
    } else {
      filter = this;
    }

    if(filter.constructor == Object) {
      ret = {};

      for(var key in filter) {
        if(type(filter[key]) != 'f') {
          ret[key] = callback.call(this, filter[key]);
        }
      }
    } else {
      each(filter, function(){
        ret.push(callback.apply(this, arguments));
      });
    }

    return ret;
  }

  var unsafe_stain = (function() {
    var pub = {},
      seed = [
        (Math.random() * Math.pow(2, 32)).toString(36),
        (Math.random() * Math.pow(2, 32)).toString(36)
      ].join(':'),

      seedid = 0,
      stainid;

    pub.stain = function(list) {
      seedid++;
      stainid = seed + seedid; 

      for(var ix = 0, len = list.length; ix < len; ix++) {
        list[ix][stainid] = true;
      }
      return stainid;
    }

    pub.isStained = function(obj) {
      var ret = obj[stainid];
      if(ret) {
        delete obj[stainid];
      }
      return ret;
    }
    return pub;
  })();


  var safe_stain = (function() {
    var pub = {},
      stainid = 0;

    pub.stain = function(list) {
      stainid++;

      for(var ix = 0, len = list.length; ix < len; ix++) {
        list[ix].constructor('i', stainid);
      }
      return stainid;
    }

    pub.isStained = function(obj) {
      return obj.constructor('i') == stainid;
    }
    return pub;
  })();

  stainer = safe_stain;

  // the list of functions to chain
  var chainList = list2obj('has isin map group remove update where select find order each like ilike'.split(' '));

  // --- START OF AN INSTANCE ----
  //
  // This is the start of a DB instance.
  // All the instance local functions
  // and variables ought to go here. Things
  // that would have been considered "static"
  // in a language such as Java or C++ should
  // go above!!!!
  //
  window.DB = function(arg0, arg1){
    var 
      constraints = {},
      ixlast = 0,
      funcMap = {},
      syncList = [],
      stainer = _unsafe ? unsafe_stain : safe_stain,
      raw = [];

    function sync() {
      for(var ix = 0; ix < syncList.length; ix++) {
        syncList[ix].call(ret, raw);
      }
    }

    function chain(list) {
      for(var func in chainList) {
        list[func] = ret[func];
      }

      return list;
    }

    var ret = expression();
    ret.isin = isin;
    ret.has = has;
    ret.ilike = ret.like = like;
    ret.each = eachApply;
    ret.map = list2obj;

    ret.setattrib = function(key, callback) {
      funcMap[key] = callback;
    }

    ret.get = function(key) {
      return funcMap[key].call(ret, raw);
    }

    ret.group = function(field) {
      var groupMap = {};

      if(this instanceof Array) {
        filter = this;
      } else {
        filter = ret.find();
      }

      each(filter, function(which) {
        if(! groupMap[which[field]]) {
          groupMap[which[field]] = [];
        }
        groupMap[which[field]].push(which);
      });
      
      return chain(groupMap);
    } 

    ret.sync = function(callback) {
      syncList.push(callback); 
    }

    ret.order = function (arg0, arg1) {
      var 
        key, 
        fnSort,
        len = arguments.length,
        order,
        filter;

      if(type(arg0) == 'f') {
        fnSort = arg0;
      } else if(type(arg0) == 's') {
        key = arg0;

        if(len == 1) {
          order = 'x - y';
        } else if(len == 2) {

          if(type(arg1) == 's') {
            if(arg1.toLowerCase() == 'asc') {
              order = 'x - y';
            } else if(arg1.toLowerCase() == 'desc') {
              order = 'y - x';
            } 
          } 

          if (typeof order == 'undefined') {
            order = arg1;
          }
        }

        if(type(order) == 's') {
          if(! _orderCache[order]) {
            order = _orderCache[order] = new Function('x,y', 'return ' + order);
          } else {
            order = _orderCache[order];
          }
        }

        fnSort = function(a, b) {
          return order(a[key], b[key]);
        }
      }

      if(this instanceof Array) {
        filter = this;
      } else {
        filter = ret.find();
      }

      return filter.sort(fnSort);
    }

    function list2data(list) {
      var 
        ix = 0,
        len = list.length,
        ret = [];

      for(; ix < len; ix++) {
        ret[ix] = raw[list[ix]];
      }

      return ret;
    }

    ret.constrain = function() {
      constraints = extend(true, constraints, kvarg(arguments)); 
    }

    ret.inverse = function(list) {
      if(arguments.length == 0 && this instanceof Array) {
        list = this;
      }

      return chain(setdiff(raw, list));
    }

    ret.where = ret.find = function() {
      return chain( 
        find.apply(this, 
          arguments.length ? 
            [raw].concat(slice.call(arguments)) : 
            [raw]
          )
        );
    }

    ret.select = function(field) {
      var 
        filter,
        resultList = {};

      if(arguments.length > 1) {
        field = slice.call(arguments);
      } else if (type(field) == 's') {
        field = [field];
      }

      if(this instanceof Array) {
        filter = this;
      } else {
        filter = ret.find();
      }

      for(var iy = 0, flen = field.length; iy < flen; iy++) {
        column = field[iy];

        for(var ix = 0, len = filter.length; ix < len; ix++) {
          row = filter[ix];

          if(column == '*') {
            resultList[ix] = values(row);
          } else if(column in row){
            if(flen > 1) {
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
      
      return chain(values(resultList));
    }

    ret.insert = function(param) {
      var 
        block = [],
        toInsert = [],
        ixList = [];

      if(arguments.length > 1) {
        toInsert = slice.call(arguments);
      } else if (type(param) == 'a') {
        toInsert = param;
      } else {
        toInsert.push(param);
      } 

      // If the user had opted for a certain field to be unique,
      // then we find all the matches to that field and create
      // a block list from them.
      if(constraints.unique) {
        block = db.find().select(constraints.unique);
      }

      each(toInsert, function(which) {
        // If the unique field has been set then we do
        // a linear search through the constraints to 
        // see if it's there.
        if(constraints.unique) {
          if(indexOf(block, which[constraints.unique]) != -1){
            return;
          }
        }

        var ix = ixlast++, data;

        try {
          if(_unsafe) {
            raw.push(which);
          } else {
            data = new (secret())();
            extend(true, data, which);
            raw.push(data);
          }
        } catch(ex) {

          // Embedded objects, like flash controllers
          // will bail on JQuery's extend because the
          // properties aren't totally enumerable.  We
          // work around that by slightly changing the 
          // object; hopefully in a non-destructive way.
          if(!unsafe) {
            which.constructor = secret();
          }
          raw.push(which);
        }

        ixList.push(ix);
      });

      sync();
      return chain(list2data(ixList));
    }

    // Update allows you to set newvalue to all
    // parameters matching constraint where constraint
    // is either a set of K/V pairs or a result
    // of find so that you can do something like
    //
    //   var result = db.find(constraint);
    //   result.update({a: b});
    //
    ret.update = function(newvalue, param) {
      var 
        list,
        key;

      if(this instanceof Array) {
        list = simplecopy(this);
      } else {
        list = ret.find();
      }

      // This permits update(key, value) on a chained find
      if( arguments.length == 2 && 
          type(newvalue) == 's'
        ) {

        // Store the key string
        key = newvalue;

        // The constraint is actually the new value to be
        // assigned.
        newvalue = {};
        newvalue[key] = param; 
      }

      each(newvalue, function(key, value) {
        if(type( value ) == 'f') {
          each(list, function(which) {
            which[key] = value(which);
          });
        } else {
          each(list, function(which) {
            which[key] = value;
          });
        }
      });

      sync();
      return chain(list);
    }

    ret.remove = function(constraint) {
      var 
        end, spliceix,
        list,
        save = [];

      if(this instanceof Array) {
        list = this;
      } else if(constraint instanceof Array) {
        list = constraint;
      } else if(arguments.length > 0){
        list = ret.find(constraint);
      } else {
        list = ret.find();
      }

      var uid = stainer.stain(list);

      // Remove the undefined nodes from the raw table
      var end = raw.length;

      for(var ix = raw.length - 1; ix >= 0; ix--) {
        if (stainer.isStained(raw[ix])) { 
          save.push(raw[ix]);
          continue;
        }
        if(end - (ix + 1)) {
          spliceix = ix + 1;
          raw.splice(spliceix, end - spliceix);
        }
        end = ix;
      }

      spliceix = ix + 1;
      if(end - spliceix) {
        raw.splice(spliceix, end - spliceix);
      }

      sync();
      return chain(save);
    }


    // The ability to import a database from somewhere
    if (arguments.length == 1) {
      switch(type(arg0)) {
        case 'a': ret.insert(arg0); break;
        case 'f': ret.insert(arg0()); break;
        case 's': return ret.apply(this, arguments); break;
        case 'o': ret.insert(arg0); break;
      }
    } else if(arguments.length > 1) {
      ret.insert(slice.call(arguments));
    }

    ret.__raw__ = raw;

    return ret;
  }

  window.DB.isin = isin;
  window.DB.find = find;
  window.DB.has = has;
  window.DB.type = type;
  window.DB.each = eachApply;
  window.DB.values = values;
  window.DB.ilike = window.DB.like = like;
  window.DB.unsafe = function() { _unsafe = true; }


  window.DB.reduceLeft = function(initial, oper) {
    var lambda = new Function("ref,x", "return ref " + oper);

    return function(list) {
      var 
        len = list.length,
        reduced = initial;

      for(var ix = 0; ix < len; ix++) {
        if(list[ix]) {
          reduced = lambda(reduced, list[ix]);
        }
      }

      return reduced;
    }
  }

  window.DB.reduceRight = function(initial, oper) {
    var lambda = new Function("ref,x", "return ref " + oper);

    return function(list) {
      var 
        len = list.length,
        reduced = initial;

      for(var ix = len - 1; ix > 0; ix--) {
        reduced = lambda(reduced, list[ix]);
      }

      return reduced;
    }
  }


})();
