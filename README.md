# Javascript Database

## <a href=#introduction>Introduction</a>

 * <a href=#syntax>Syntax notes</a>
 * <a href=#support>Supported Platforms</a>
 * <a href=#dependencies>Dependencies</a>
 * <a href=#performance>Performance</a>
 * <a href=#license>License</a>
 * <a href=#contact>Contact</a>
 * <a href=#similar>Similar Projects</a>
 * <a href=#alt>Browser-based Alternatives</a>

## API

### <a href=#inserting>Inserting and Removing</a>

 * <a href=#initialization>Initialization</a>
 * <a href=#transforming>Transforming</a>
 * <a href=#insert>insert</a>
 * <a href=#update>update</a>
 * <a href=#remove>remove</a>
 * <a href=#constrain>constrain</a>

### <a href=#finding>Finding</a>

 * <a href=#find>find</a>
 * <a href=#findFirst>findFirst</a>
 * <a href=#like>like</a>
 * <a href=#isin>isin</a>
 * <a href=#has>has</a>
 * <a href=#select>select</a>
 * <a href=#inverse>inverse</a>

### <a href=#manipulating>Manipulating</a>

 * <a href=#each>each</a>
 * <a href=#reduceLeft>reduceLeft</a>
 * <a href=#reduceRight>reduceRight</a>
 * <a href=#order>order</a>
 * <a href=#order>sort</a>
 * <a href=#group>group</a>

### <a href=#storage>Storage</a>

 * <a href=#sync>sync</a>

### <a href=#example>Examples</a>

<hr>

<h2 name=inserting>Inserting and Removing</h2>

<h3 name=initialization> DB() </h3>
Create a new database and assign it to a variable.  The variable is
a function and has properties associated with it. The rest of this
document will use "db" as in an instance of DB().

<h3 name=transforming>Transforming</h3>
You can take existing data that is represented by an array-like entity of
objects and use it as the data to test against.

For instance, this works:

    var something_i_dont_have_time_to_rewrite = 
      [{ 
          node: $("<div />").blahblah
          name: "something else"
          other_legacy_stuff: "blah blah"
        },
        {
        }
       ...
      ]

    DB(something_i_dont_have_time_to_rewrite)
      .find({name: 'something else'})
      .select('node')


Along with this:

    DB.find(
      document.getElementsByTagName(' * '), 
      db.like('innerHTML', 'hello World')
    )

<h3 name=insert> insert( rows ) </h3>
This is to insert data into the database.  You can either insert
data as a list of arguments, as an array, or as a single object.

After you have inserted the data, you are returned references to
the data you insert.  This allows you to have a function like:

    function my_insert(data) {
    
       db.insert({
          uid: ++my_uid,
          ...
          accounting: data
       }).update( data );

    }

In the function above you have a generic function that inserts data
and puts in some type of record keeping information and accounting.

Instead of doing a JQuery $.extend or other magic, you can simply insert
the data you want, then update it with more data.

<h3 name=update> update( field )</h3>
Update allows you to set newvalue to all
parameters matching constraint where constraint
is either a set of K/V pairs or a result
of find so that you can do something like

Update also can take a callback.  Say you wanted to decrease a reference
count of some object that matches a set.  You can do

    db
      .find({ 
        id: db.isin( set ) 
      })
      .update({
        referenceCounter: function(number) {
          return number - 1;
        })
      });

<h3 name=remove> remove( constraint )</h3>
This will remove the entries from the database but also return them if
you want to manipulate them.  You can invoke this with a constraint.

<h3 name=constrain> constrain( type, value ) </h3>
This is to constrain the database.  Currently you can enforce a unique
key value through something like `db.constrain('unique', 'somekey')`.
You should probably run this early, as unlike in RDBMSs, it doesn't do
a historical check nor does it create a optimized hash to index by
this key ... it just does a lookup every time as of now.

<h2 name=finding> Finding </h2>

<h3 name=find> find( constraint )</h3>
This is like the "where" clause in SQL.  You
can invoke it one of the following ways:

 * `find({key: 'value'})`
 * `find('key', 'value')`
 * `find({key: function(value) { return value < 10; })`
 * `find({key: db('< 10')})`
 * `find(db('key', '< 10'))`


<h4 name=findFirst> findFirst( constraint )</h4>
This is a shorthand to find for when you are only expecting one result.
**Please note that findFirst ALWAYS returns an object.  If there was no match
then the returned object is empty.**

<h4 name=like> like( string )</h4>
This is like SQL like command and it takes the value and does

 `value.toString().toLowerCase().search(query.toString().toLowerCase) > -1`

which is a mouthful.

<h4 name=isin> isin( multi )</h4>
This is like the SQL "in" operator, which is a reserved JS word.  You can invoke it either
with a static array or a callback like so:

 * `db.isin('months', ['jan','feb','march'])`
 * `db.isin('months', function(){ ... })`

A usage scenario may be as follows:

`db.find({months: db.isin(['jan', 'feb', 'march']));`   

<h4 name=has> has( multi )</h4>
This is the reverse of has.  If you do

`db.insert({a: [1, 2, 3]})`

You can do

`db.find({a: db.has(1)})`

<h3 name=select> select( field(s) )</h3>
This will extract the values of a particular key from the filtered list
and then return it as an array or an array of arrays, depending on
which is relevant for the query.

You can also do db.select(' * ') to retrieve all fields, although the 
key values of these fields aren't currently being returned.

You can do 

 * `select('one', 'two')`
 * `select(['one', 'two'])`

But not:

 * `select('one,two')`

Since ',' is actually a valid character for keys in objects.  Yeah,
it's the way it is. Sorry.

<h3 name=inverse> inverse( list )</h3>
Invert a set of results.

<h2 name=manipulating> Manipulating </h2>

<h4 name=each> each( function ) </h4>
This is more of a convenience on select for when you do select('one','two')
and then you want to format those fields.  The example file included in the git repo has a usage of this.

<h4 name=reduceLeft> reduceLeft( list, function )</h4>
This does a traditional list-reduction on a list
as popular in list comprehension suites common in 
functional programming.

<h4 name=reduceRight> reduceRight( list, function ) </h4>
This does a traditional right-reduction on a list
as popular in list comprehension suites common in 
functional programming.

<h3 name=order> order( multi ) </h3>
 *Aliased to sort*

This is like SQLs orderby function.  If you pass it just a field, then
the results are returned in ascending order (x - y).  

You can also supply a second parameter of a case insensitive "asc" and "desc" like in SQL.

Summary:

 * `order('key')`
 * `order('key', 'asc')`
 * `order('key', 'desc')`

**Note that the invocation styles above don't work on String values by default as of now.**

<h3 name=group> group( field )</h3>
This is like SQLs groupby function. It will take results from any other function and then
return them as a hash where the keys are the field values and the results are an array
of the rows that match that value.

Example:

  Pretend I had the following data:

    { department: accounting, name: Alice }
    { department: accounting, name: Bob }
    { department: IT, name: Eve }

  If I ran the following:

    db.find().group('department')

  I'd get the result:

    {
      accounting: [
        { department: accounting, name: Alice }
        { department: accounting, name: Bob }
      ]
      IT: [
        { department: IT, name: Eve }
      ]
    }

There's another example in the test.html file at around line 414

#### Callback based ordering
You can also do callback based sorting like so:

 * `order('key', function(x, y) { return x - y } )`
 * `order(function(a, b) { return a[key] - b[key] })`
 * `order('key', 'x - y')` *see below*

It's worth noting that if you are using the last invocation style, the
first parameter is going to be x and the second one, y.


<h2 name=storage> Storage </h2>
What if you have an existing database from somewhere and you want to import
your data when you load the page.  You can supply the data to be imported
as an initialization variable.  For instance, say you are using [jStorage](http://www.jstorage.info/)
you could initialize the database as follows:

`var db = DB($.jStorage.get('government-secrets'));`

<h3 name=sync> db.sync(callback) </h3>
To store the data when it is updated, you define a "sync" function.  Using our
jStorage example from above, we would 'sync' back to by doing the following:

`db.sync( function(data) { $.jStorage.set('government-secrets', data); } )`

The example file includes a synchronization function that logs to screen
when it is run so you can see when this function would be called.  Basically
it is done at the END of a function call, regardless of invocation.  That is
to say, that if you update 10 records, or insert 20, or remove 50, it would be
run, once, once, and once respectively.

<h2 name=examples> Examples</h2>
### Creation and Insertion
Lets start with a trivial example; we will create a database and then
just add the object `{key: value}` into it.

    var db = DB();
    db.insert({key: value});

Now let's say we want to insert `{one: 1, two: 2}` into it

`db.insert({one: 1, two: 2})`

Alright, let's say that we want to do this all over again and now insert
both fields in.  We can do this a few ways:

1. As two arguments: `db.insert({key: value}, {one: 1, two: 2});`
2. As an array: `db.insert([{key: value}, {one: 1, two: 2}]);`
3. Or even chained: `db.insert({key: value}).insert({one: 1, two: 2});`



## SQL => DB examples
`remove from users where lastlogin = false` => `users.find({lastlogin: false}).remove();`

    select * from people where id in (
       select id from addresses where city like 'los angeles'
    ) order by income asc limit 10 offset 1

becomes:

    people.find({ id: DB.isin(
       addresses.find( DB.like('city', 'los angeles') ).select('id')
    }).order('income').slice(1, 10)



### DB.unsafe()
Enables unsafe optimizations.  Specifically, db.isin uses regex matching for small sets as opposed to indexOf and insertions
are sped it because instead of using a special type of object internally to do bookkeeping, objects get stained with sufficiently
large keys for some internal operations.

<h2 name=introduction>Introduction</h2>

Have you ever thought "gee this problem is tough. if only I had an SQL database to run queries on, in the browser, like an SQLite for JS, life would be easy".

Sure, this may be available as a subsystem in fancy new-age browsers (see below) but what about the other 80% of the market? And what if you want to do things in a javascripty way?
As a result, it (the library) tries to address specific classes of problems more than be a strict accessor to an SQL sub-system.

Well, look no further comrade, the purpose of this project is to make something that can be described as:

    It's basically SQL, but in the browser.

Let me show you how awesome this can be.
Take a familiar SQL query like this:

`select firstname, age from people where age > 30 order by age desc`

And with a little bit of javascripty magic, we can do this:

    people
      .find(DB('age', '> 30'))
      .order('age', 'desc')
      .select('firstname', 'age')

And bam! There you go. Who said life wasn't easy?

Just remember these two simple rules:

1. First filter your search results to the entries you are interested in. In SQL land, this would usually go in the "where" clause.  I call it "find" to make it more of a verb then an proposition. But if you REALLY want to use "where", it's aliased for you cause I hate being imposing.

2. Ok, after you have your items of interest you can now run various operations on those filtered results.  For instance, you can remove them, or update them, or show some records of them.

**tl;dr**

1. Do your "SQL where" stuff first.
2. Everything else second.

<h3 name=syntax>Syntax Notes</h3>
Great lengths have been taken to have a flexible and expressive API that
conforms to dynamic coding styles.

For instance, if you wanted to update 'key' to be 'value' for all records
in the database, you could do it like

`db.update('key', 'value')` 

or

`db.update({key: 'value'})`

or you can chain this under a find if you want to only update some records

`db.find({key: 'value'}).update({key: 'somethingelse'})`

etc...

The basic idea is that **you are using this API because you want life
to be painless and easy**.  You certainly don't want to wade through
a bunch of documentation or have to remember strange nuances of how
to invoke something.  You should be able to take the cavalier approach and
*Get Shit Done(tm)*.


Also, please note:
### Every command is not only chainable, but also returns a standard javascript array of results.

What I mean by this is that you can do 

    var result = db.find({processed: true});
    alert([ 
      result.length,
      result[result.length - 1],
      result.pop(),
      result.shift()
    ].join('\n'));

    result.find({hasError: true}).remove();
    
Note that my arrays are pure magic here and I do not beligerently append
arbitrary functions to Array.prototype.  


<h3 name=support>Supported Platforms</h3>

This has been tested and is known to work on

 * IE 5.5+
 * Firefox 2+
 * Chrome 8+
 * Safari 2+
 * Opera 7+

<h3 name=depenedencies>Dependencies</h3>
none.

<h3 name=performance>Performance</h3>
Read [this comparison](https://github.com/danstocker/jorder/wiki/Benchmarks) by Dan Stocker. 

<h3 name=license>License</h3>
Dual-Licensed under MIT and GPL.

<h3 name=contact>Contact</h3>
[Join the mailing list](http://groups.google.com/group/dbjs).

<h3 name=similar>Similar Projects</h3>
Read [this comparison](https://github.com/danstocker/jorder/wiki/Benchmarks) by Dan Stocker. 

<h3 name=alt>Browser-Based Alternatives</h3>
Part of [HTML5](http://dev.w3.org/html5/webdatabase/#databases) has SQL support in the land of future browsers.

There's two interfaces, "IndexedDB" and the deprecated "WebSQL".  As always, the browser world seems to be split.

 * [Safari has supported WebSQL](http://www.webkit.org/blog/126/webkit-does-html5-client-side-database-storage/) for a while and is working on [indexedDB](https://github.com/NielsLeenheer/html5test/pull/68) support. 
 * [Chrome has had WebSQL support since version 4](http://www.infoq.com/news/2010/02/Web-SQL-Database) and used a [different interface](http://code.google.com/apis/gears/upcoming/api_database.html) prior to that.  IndexedDB support came in through [chromium](http://weblog.bocoup.com/javascript-indexeddb-in-chromium-8-0-552-5-dev).
 * [Firefox 4 had various interfaces](http://hacks.mozilla.org/2010/06/comparing-indexeddb-and-webdatabase/) but apparently only [indexedDB](https://developer.mozilla.org/en/IndexedDB) is supported at this time.
 * [Opera 11 has IndexedDB support](http://dev.opera.com/articles/view/taking-your-web-apps-offline-web-storage-appcache-websql/).
 * [Internet Explorer 9 has IndexedDB support](http://msdn.microsoft.com/en-us/scriptjunkie/gg679063) tentatively.

