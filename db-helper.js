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

DB.tabular = function(db, row_key, col_key, cell_key, agg) {
  agg = agg || DB.sum;

  var 
    row_values = db.distinct(row_key),
    col_values = db.distinct(col_key),
    header = [[row_key].concat(col_values)];

  return header.concat(
    DB.map(row_values, function(row) {
      var sub_db = db.find(row_key, row);

      return [row].concat(
        DB.map(col_values, function(col) {
          return agg( sub_db.find(col_key, col), cell_key ) || 0;
        })
      );

    })
  );
}
