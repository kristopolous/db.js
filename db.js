(function(){
  function indexOf(which, searchElement) {
    for(var ix = which.length - 1; 
        ix > -1 ;
        ix--
      ) { 
      if (searchElement == which[ix]) {
        break;
      }
    }

    return ix;
  }

  function expression(){
    if(typeof arguments[0] == 'string') {
      if(arguments.length == 1) {
        return new Function("$$x$$", "return $$x$$ " + arguments[0]);
      }

      if(arguments.length == 2 && typeof arguments[1] == 'string') {
        var obj = {};
        obj[arguments[0]] = new Function("$$x$$", "return $$x$$ " + arguments[1]);
        return obj;
      }
    } 
  }

  // The first parameter, if exists, is assumed to be the value in the database,
  // which has a content of arrays, to search.
  // The second parameter is the index to search
  function has(param1, param2) {
    var 
      callback,
      comparator,
      obj = {};

    if(arguments.length == 1) {
      comparator = param1;
    } else if(arguments.length == 2){
      comparator = param2;
    } 

    if(comparator.constructor == Array) {
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

    if(arguments.length == 2) {
      obj = {};
      obj[param1] = callback;
      return obj;
    } else {
      return callback;
    }
  }

  function isin(param1, param2) {
    var 
      comparator,
      obj = {};

    if(arguments.length == 1) {
      comparator = param1;
    } else if(arguments.length == 2){
      comparator = param2;
    } 

    // If the second argument is an array then we assume that we are looking
    // to see if the value in the database is part of the user supplied funciton
    if(comparator.constructor == Array) {
      comparator = function(x) { return indexOf(x, comparator) > -1; };
    } else if (comparator instanceof Function) {
      comparator = function(x) { return indexOf(x, comparator()) > -1; };
    } 

    if(arguments.length == 2) {
      obj = {};
      obj[param1] = comparator;
      return obj;
    } else {
      return comparator;
    }
  }

  function like(param1, param2) {
    var 
      comparator,
      query,
      obj = {};

    if(arguments.length == 1) {
      query = param1;
    } else if(arguments.length == 2){
      query = param2;
    } 

    query = query.toString().toLowerCase();

    comparator = function(x) { return x.toString().toLowerCase().search(query) > -1; };

    if(arguments.length == 2) {
      obj = {};
      obj[param1] = comparator;
      return obj;
    } else {
      return comparator;
    }
  }

  window.DB = function(){
    var 
      constraints = {},
      ixlast = 0,
      raw = {};


    // Jacked from Resig's jquery 1.5.2
    // The code has been modified to not rely on jquery
    function extend() {
      var 
        options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

      // Handle a deep copy situation
      if ( typeof target === "boolean" ) {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
      }
   
      // Handle case when target is a string or something (possible in deep copy)
      if ( typeof target !== "object" && typeof target !== 'function') {
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
            if ( deep && copy && ( copy.constructor == Object || (copyIsArray = (copy.constructor == Array)) ) ) {
              if ( copyIsArray ) {
                copyIsArray = false;
                clone = src && (src.constructor == Array) ? src : [];
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

    function keys(obj) {
      var ret = [];

      for(var key in obj) {
        ret.push(key);
      }

      return ret;
    }

    var obj2list = keys;

    function each(obj, cb) {
      if (obj instanceof Array) {
        var 
          ix = 0,
          len = obj.length;

        for(; ix < len; ix++) {
          cb(obj[ix], ix);
        }
      } else {
        for(var key in obj) {
          cb(key, obj[key]);
        }
      }
    }

    function res2list(res) {
      var list = [];

      each(res, function(which) {
        list.push(which.constructor('ix'));
      });

      return list;
    }

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
      
    function list2data(list) {
      var 
        ix = 0,
        len = list.length,
        ret = new Array(len);

      for(; ix < len; ix++) {
        ret[ix] = raw[list[ix]];
      }

      return ret;
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

    // An encapsulator for hiding internal variables
    function secret() {
      var cache = {};
      return function(){
        if (arguments.length == 1) { return cache[arguments[0]];}
        if (arguments.length == 2) { cache[arguments[0]] = arguments[1]; }
      };
    }

    ret = expression;
    ret.expr = expression;
    ret.isin = isin;
    ret.has = has;
    ret.ilike = ret.like = like;

    function chain(list) {
      for(var func in ret) {
        list[func] = ret[func];
      }

      return list;
    }

    function find() {
      var 
        filterList = Array.prototype.slice.call(arguments),
        iy,
        ix,
        len,
        key,
        which,
        filtered,
        nextRound = [],
        value;

      // This permits a subfind
      if(this instanceof Array) {
        filtered = keys(this);
      } else {
        filtered = keys(raw);
      }

      if(filterList.length == 0) {
        filterList = [{}];
      }
      
      // This permits find(key, value)
      if( filterList.length == 2 && 
          typeof filterList[0] == 'string'
        ) {
          which = {};
          which[filterList[0]] = filterList[1];
          filterList = [deepcopy(which)];
      }

      // We can either do find({}) or find({},{},{})
      for(iy = 0; iy < filterList.length; iy++) {
        var obj = filterList[iy];

        each(obj, function(key, value) {

          // If the directive is not, then we find everything
          // that satisfies the query after the not
          if(key == 'not' && typeof value == 'object') {
            nextRound = setdiff(filtered, find(value));
          } else {
            len = filtered.length;

            for(ix = 0; ix < len; ix++) {
              which = filtered[ix];

              if( 
                // Check for existence
                key in raw[which] && (

                  // This is an expression based callback
                  (
                    typeof value == 'function' &&
                    value(raw[which][key])
                  ) ||

                  // Trivial value comparison
                  (raw[which][key] == value)  ||

                  // Less trivial value comparison
                  ( (
                      value.toString &&
                      raw[which][key].toString
                    ) && (
                      value.toString() ==
                      raw[which][key].toString()
                    )
                  )
                ) 
              ) {
                nextRound.push(which);
              }
            }
          }

          filtered = nextRound;
          nextRound = [];
        });
      }

      return chain(filtered);
    }

    ret.constrain = function() {
      constraints = extend(true, constraints, kvarg(arguments)); 
    }

    ret.each = function(callback) {
      var 
	      ret = [],
	      filter;

      if(arguments.length == 2) {
	      filter = arguments[0];
	      callback = arguments[1];
	    } else {
        filter = this;
      }

      each(filter, function(){
        ret.push(callback.apply(this, arguments));
      });

      return ret;
    }

    ret.inverse = function(list) {
      if(arguments.length == 0 && this instanceof Array) {
        list = this;
      }

      return chain(setdiff(keys(raw), list));
    }

    ret.where = ret.find = function() {
      return chain(list2data(find.apply(this, arguments)));
    }

    ret.select = function(field) {
      var 
        result,
        filter,
        resultList = [];

      if(arguments.length > 1) {
        field = Array.prototype.slice.call(arguments);
      } else if (typeof field == 'string') {
        field = [field];
      }

      if(this instanceof Array) {
        filter = this;
      } else {
        filter = ret.find();
      }

      each(filter, function (row) {
        result = [];

        each(field, function (column) {
          if(column == '*') {
            result = result.concat(values(row));
          } else {
            result.push(row[column]);
          }
        });

        resultList.push(result);
      });
        
      // select doesn't change data
      //ret.sync(raw);
      
      return chain(resultList);
    }

    ret.insert = function(param) {
      var 
        block = [],
        toInsert = [],
        ixList = [];

      if(arguments.length > 1) {
        toInsert = Array.prototype.slice.call(arguments);
      } else if (param.constructor == Array) {
        toInsert = param;
      } else if (param.constructor == Object) {
        toInsert = [param];
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

        var ix = ixlast++;
        raw[ix] = new (secret())();
        extend(true, raw[ix], which);
        raw[ix].constructor('ix', ix);

        ixList.push(ix);
      });

      ret.sync(raw);
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
        list = res2list(this);
      } else {
        list = find();
      }

      // This permits update(key, value) on a chained find
      if( arguments.length == 2 && 
          typeof arguments[0] == 'string'
        ) {

        // Store the key string
        key = newvalue;

        // The constraint is actually the new value to be
        // assigned.
        newvalue = {};
        newvalue[key] = param; 
      }

      each(newvalue, function(key, value) {
        if(typeof value == 'function') {
          each(list, function(index) {
            raw[index][key] = value(raw[index]);
          });
        } else {
          each(list, function(index) {
            raw[index][key] = value;
          });
        }
      });

      ret.sync(raw);
      return chain(list2data(list));
    }

    ret.order = function() {
      var 
        key, 
        fnSort,
        order,
        filter;

      if(typeof arguments[0] == 'function') {
        fnSort = arguments[0];
      } else if(typeof arguments[0] == 'string') {
        key = arguments[0];

        if(arguments.length == 1) {
          order = 'x - y';
        } else if(arguments.length == 2) {

          if(typeof arguments[1] == 'string') {
            if(arguments[1].toLowerCase() == 'asc') {
              order = 'x - y';
            } else if(arguments[1].toLowerCase() == 'desc') {
              order = 'y - x';
            } 
          } 

          if (typeof order == 'undefined') {
            order = arguments[1];
          }
        }

        if(typeof order == 'string') {
          order = new Function('x,y', 'return ' + order);
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

      // Order doesn't change data
      //ret.sync(raw);
     
      return filter.sort(fnSort);
    }

    ret.remove = function(constraint) {
      var 
        list,
        save = [];

      if(this instanceof Array) {
        list = res2list(this);
      } else if(constraint instanceof Array) {
        list = res2list(constraint);
      } else {
        list = find(constraint);
      }

      each(list, function(index) {
        save.push(deepcopy(raw[index]));
        delete raw[index];
      });

      ret.sync(raw);
      return chain(save);
    }

    ret.sync = function() {}

    // The ability to import a database from somewhere
    if (arguments.length == 1) {
      if (arguments[0].constructor == Array) {
        ret.insert(arguments[0]);
      } else if (arguments[0].constructor == Function) {
        ret.insert(arguments[0]());
      } else if (arguments[0].constructor == Object) {
        ret.insert(arguments[0]);
      } else if (arguments[0].constructor == String) {
        return expr.apply(this, arguments);
      }
    } else if(arguments.length > 1) {
      ret.insert(Array.prototype.slice.call(arguments));
    }

    return ret;
  }

  window.DB.expr = expression;
  window.DB.isin = isin;
  window.DB.has = has;
  window.DB.ilike = window.DB.like = like;

})();
