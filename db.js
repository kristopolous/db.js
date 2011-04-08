var DB = function(){
  var 
    ixlast = 0,
    raw = {};

  function indexOf (which, searchElement /*, fromIndex */) {
    if (which === void 0 || which === null) {
      throw new TypeError();
    }

    var 
      t = Object(which),
      len = t.length >>> 0;

    if (len === 0) {
      return -1;
    }

    var n = 0;
    if (arguments.length > 0) {
      n = Number(arguments[1]);

      if (n !== n) { // shortcut for verifying if it's NaN
        n = 0;
      } else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }
    }

    if (n >= len) {
      return -1;
    }

    var k = n >= 0
          ? n
          : Math.max(len - Math.abs(n), 0);

    for (; k < len; k++) {
      if (k in t && t[k] === searchElement) {
        return k;
      }
    }

    return -1;
  };

  function shallowcopy(from) {
    var shallow = {};

    for(var key in from) {
      shallow[key] = from[key];
    }

    return shallow;
  }

  function list2obj(list) {
    var ret = {};
    each(list, function(which) {
      ret[which] = true;
    });

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
      list.push(which.$$__ix__$$);
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


  function ret(){
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

    var resultant = raw;

    each(Array.prototype.slice.call(arguments), function(which) {
      for(var directive in which);

      resultant = ret[directive](which[directive], resultant);
    });

    return resultant;
  }

  function chain(list) {
    for(var func in ret) {
      list[func] = ret[func];
    }
    return list;
  }

  ret.insert = function(param) {
    if(arguments.length > 1) {
      return arguments.callee.call(this, Array.prototype.slice.call(arguments));
    }

    if(param instanceof Array) {
      var ixList = [];

      each(param, function(which) {
        ixList.push(ret.insert(which));
      });

      return ixList;
    } 

    var ix = ixlast++;

    raw[ix] = param;
    raw[ix].$$__ix__$$ = ix;

    return ix;
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
        filterList = [shallowcopy(which)];
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

                // Trivial string comparison
                (raw[which][key] == value) || (

                  // This supports the key: [1,2,3,4] format
                  value instanceof Array &&
                  typeof raw[which][key] == 'string' &&
                  indexOf(value, raw[which][key]) > -1
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

  ret.each = function(callback) {
    var ret = [];
    each(this, function(){
      ret.push(callback.apply(this, arguments));
    });
    return ret;
  }

  ret.inverse = function(list) {
    return chain(setdiff(keys(raw), list));
  }

  ret.find = function() {
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
        result.push(row[column]);
      });

      resultList.push(result);
    });
      
    return chain(resultList);
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

    return chain(list2data(list));
  }

  ret.order = function() {
    var 
      key, 
      value, 
      filter;

    if(typeof arguments[0] == 'string') {
      key = arguments[0];

      if(arguments.length == 1) {
        value = 'x - y';
      } else if(arguments.length == 2) {

        if(typeof arguments[1] == 'string') {
          if(arguments[1].toLowerCase() == 'asc') {
            value = 'x - y';
          } else if(arguments[1].toLowerCase() == 'desc') {
            value = 'y - x';
          } 
        } 

        if (typeof value == 'undefined') {
          value = arguments[1];
        }
      }
    }

    if(typeof value == 'string') {
      value = new Function('x,y', 'return ' + value);
    }
    
    if(this instanceof Array) {
      filter = this;
    } else {
      filter = ret.find();
    }

    return filter.sort(function(a, b) {
      return value(a[key], b[key]);
    });
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
      save.push(shallowcopy(raw[index]));
      delete raw[index];
    });

    return chain(save);
  }

  return ret;
}
