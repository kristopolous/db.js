// An extended non-essential suite of add on functions which are
// used in the readme
DB.sum = DB.reduceLeft(function(total, row, what) {
  return total + row[what];
});

DB.max = DB.reduceLeft(Number.MIN_VALUE, function(max, row, field) { 
  return row[field] > max ? row[field] : max; 
});

DB.min = DB.reduceLeft(Number.MAX_VALUE, function(min, row, field) { 
  return row[field] < min ? row[field] : min;
});

// required:
//    row_key 
//    col_key
//    cell_key - either 1 value or an array corresponding to the
//      col_values. Example: {traffic: 'total', access: 'commitment'}...
//
// optional:
//    agg - aggregating function
//    row_order - ordered array of rows to show
//    col_order - ordered array of cols to show
//    name - optional word to go at cell 0,0 - defaults to row_key
//    header - a complete custom header
//
DB.tabular = function tabular(db, opts) {
  opts = opts || {};

  var 
    rows,
    order = opts.order,
    row_key = opts.row_key,
    col_key = opts.col_key,
    cell_key = opts.cell_key,
    agg = opts.agg || DB.sum,
    row_values = opts.row_order || db.distinct(row_key),
    col_values = opts.col_order || db.distinct(col_key),
    cell_key_list = {},
    header = [
      opts.header || 
      [opts.name || row_key].concat(col_values)
    ];

  if(DB.isString(cell_key)) {
    DB.each(col_values, function(col) {
      cell_key_list[col] = cell_key;
    });
  } else {
    cell_key_list = cell_key;
  }
    
  rows = DB.map(row_values, function(row) {
    var sub_db = db.find(row_key, row);

    return [row].concat(
      DB.map(col_values, function(col) {
        return agg( sub_db.find(col_key, col), cell_key_list[col] ) || 0;
      })
    );

  });

  if(DB.isString(order)) {
    var offset = col_values.indexOf(order) + 1;
    order = function(a, b) { 
      return b[offset] - a[offset];
    }
  }

  if(DB.isFunction(order)) {
    rows = rows.sort(order);
  }

  return header.concat(rows);
}
