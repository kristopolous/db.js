<h1><a name=toc> Javascript Database</a>

### <a href=#introduction>Introduction</a>

 * <a href=#syntax>Syntax notes</a>
 * <a href=#support>Supported Platforms</a>
 * <a href=#dependencies>Dependencies</a>
 * <a href=#performance>Performance</a>
 * <a href=#license>License</a>
 * <a href=#contact>Contact</a>
 * <a href=#similar>Similar Projects</a>
 * <a href=#alt>Browser-based Alternatives</a>
 * <a href=#users>Users</a>

### <a name=toc-inserting href=#inserting>Inserting and Removing</a> records

 * <a href=#initialization>Initialization</a> a new database
 * <a href=#transforming>Transforming</a> existing data
 * <a href=#insert>Insert</a> new records
 * <a href=#mutator>Mutator</a> functions as values
 * <a href=#template>Template</a> based insertion
 * <a href=#update>Update</a> exiting records
 * <a href=#remove>Remove</a> records and get a copy of them
 * <a href=#constrain>Constrain</a> insertion by a unique, primary key

### <a name=toc-finding href=#finding>Finding</a> and searching for data

 * <a href=#find>Find</a> records through an expressive syntax
 * <a href=#findFirst>findFirst</a> record through an easy syntax
 * <a href=#like>like</a> to find records by substring
 * <a href=#isin>isin</a> to find whether the record is in a group
 * <a href=#has>has</a> to look inside a record stored as an array
 * <a href=#missing>missing</a> to get records that have keys not defined
 * <a href=#hasKey>hasKey</a> to get records that have keys defined
 * <a href=#select>select</a> one or more fields from a result
 * <a href=#invert>invert</a> to find the unary inverse of a set of results
 * <a href=#view>view</a> data easily

### <a name=toc-manipulating href=#manipulating>Manipulating</a> retrieved data

 * <a href=#each>each</a> or <a href=#each>map</a> results to new values
 * <a href=#reduceLeft>reduceLeft</a> results to aggregate values
 * <a href=#reduceRight>reduceRight</a> results to aggregate values
 * <a href=#order>order</a> or <a href=#order>sort</a> results given some function or expression
 * <a href=#group>group</a> results by some key

### <a href=#storage>Storage</a> options to importing and expoting data

 * <a href=#sync>sync</a> the database when things are modified

### <a href=#example>Examples</a>
 
 * <a href=#ex-creation>Creating and Inserting</a>
 * <a href=#ex-sql>SQL to DB example</a>
 * <a href=#ex-more>More</a>

<h2><a name=inserting>Inserting and Removing</a> [ <a href=#toc>top</a> ] </h2>

<h3><a name=initialization> DB() </a> [ <a href=#toc-inserting>top</a> ] </h3>
Create a new database and assign it to a variable.  The variable is
a function and has properties associated with it. The rest of this
document will use "db" as in an instance of DB().

<h3><a name=transforming>Transforming</a> [ <a href=#toc-inserting>top</a> ] </h3>
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

There is also a routine named `DB.objectify` which takes a set of keys and values and
emits an object.  For instance, if you had a flat data structure, say, from CSV, like this:

    var FlatData = [
      [ "FIRST", "LAST" ],
      [ "Alice", "Foo" ],
      [ "Bob", "Bar" ],
      [ "Carol", "Baz" ]
    ];

Then you can do this:

    DB.objectify(FlatData[0], FlatData.slice(1));

And you'd get:

    [
      { First: "Alice", Last: "Foo" },
      { First: "Bob", Last: "Bar" },
      { First: "Carol", Last: "Baz" }
    ]

So you can combine these two and then do an insertion:

    var myDB = DB( DB.objectify(FlatData[0], FlatData.slice(1)) );

<h3><a name=insert> insert( arguments | object | array ) </a> [ <a href=#toc-inserting>top</a> ] </h3>
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

<h3><a name=mutator> insert( lambda ) </a> [ <a href=#toc-inserting>top</a> ] </h3>
Values can also be mutators.  This semantically changes what update and find mean.  Value based mutators can be used
to achieve many aspects of list comprehension. Find will run the mutator with no arguments while update will pass the
argument to the mutator; with the argument itself of course, possible to be another lambda.  

To help wrap your head around it, the example below adds or subtracts a local variable based on the value passed in:

    var db = DB({key: (function(){
      var value = 0; 

      return function(modifier){
        if(arguments.length) {
          value += modifier;
        }
        return value;
      }
    })()});

If you run a db.find({key: 0}) on this then the function will be run, returning the value at its initial state.  In this
case it would be 0.

Semantically, the update will now pass in a value, as mentioned above.  So if you do something like:

    db.update({key: 4});

Now the value in the closure will be "4" and a db.find({key: 4}) will return.
<!--
<h3>Random set example</h3>

As another example, pretend you want a set of n numbers with a range from min to max.-->

<h3><a name=template> Templates </a> [ <a href=#toc-inserting>top</a> ] </h3>
Templates permit you to have a set of K/V pairs or K/lambda pairs that act as
a baseline for record insertion.  You can create, update, get, and destroy templates.
They are not retroactive and only affect insertions that are done after the template
is created.

The template itself is implicit and modal; applying to all insertions until it is
modified or removed.

<h5>Creation

To create a template use template.create( fields )

<h5>Update

Updating overwrite previous values as specified whilst retaining the old values of
those which are not.  To update a template use template.update( fields )

<h5>Getting

You can get the current template with template.get()

<h5>Destroy

You can destroy a template with template.destroy()

<h3><a name=update> [chain] update( object | lambda | [ key, value ] )</a> [ <a href=#toc-inserting>top</a> ] </h3>
Update allows you to set newvalue to all parameters matching a constraint.  
You can pass a lambda in to assign new values
to a record. For instance:

    db.find().update( function(record) { record.key = 'value' } );

will work.  The object syntax, similar to find will also work.  So you can do

    db.find().update({ key: function() { return 'value' } });

And lastly, you can do static assignment two ways:

    db.find().update({ key: 'value' });
    db.find().update('key', 'value');

<h3><a name=remove> [chain] remove( object | lambda | [ key, value ] )</a> [ <a href=#toc-inserting>top</a> ] </h3>
This will remove the entries from the database but also return them if
you want to manipulate them.  You can invoke this with a constraint.

<h3><a name=constrain> constrain( type, value ) </a> [ <a href=#toc-inserting>top</a> ] </h3>
This is to constrain the database.  Currently you can enforce a unique
key value through something like `db.constrain('unique', 'somekey')`.
You should probably run this early, as unlike in RDBMSs, it doesn't do
a historical check nor does it create a optimized hash to index by
this key ... it just does a lookup every time as of now.

<h2><a name=finding> Finding </a> [ <a href=#toc>top</a> ] </h2>

<h3><a name=find> [chain] find( object | lambda | [key, value] )</a> [ <a href=#toc-finding>top</a> ] </h3>
*Also a top level function*

This is like the "where" clause in SQL.  You
can invoke it one of the following ways:

 * by Object: find({key: 'value'})
 * by ArgList: find('key', 'value')
 * by record Function: find(function(record) { return record.value < 10; })
 * by key Function: find({key: function(value) { return value < 10; })
 * by key Expression: find({key: db('< 10')})
 * by anonymous Expression: find(db('key', '< 10'))

<h3>About the arguments</h3>
It can receive multiple arguments for multiple constraints.  For instance, you can
use an object style filter followed by a functional one, e.g.

    find( {key: value}, lambdaFilter );

These operate together as an "AND" and is equivalent to doing something like:

    find( {key: value} ).find( lambdaFilter );

<h3>About the callback function style</h3>
The arguments passed in for the functional style are either the whole record if invoked
in the style of find( lambda ) or the key being argument 0 and the record being argument 1
in the style of find({key: lambda}).  Therein you can have something like 

   find(function(record) {
      return record.key1 > record.key2;
   });


<h3><a name=findFirst> [chain] findFirst( object | lambda | [key, value] )</a> [ <a href=#toc-finding>top</a> ] </h3>
*Also a top level function*

This is a wrapper of find for when you are only expecting one result.
**Please note that findFirst ALWAYS returns an object.  If there was no match
then the returned object is empty.**

<h3><a name=like> [chain] like( string | argList )</a> [ <a href=#toc-finding>top</a> ] </h3>
A macro lambda for find that does a case-insensitive regex search on the values for keys.
This is similar to the SQL like command and it takes the value and does

   value.toString().toLowerCase().search(query.toString().toLowerCase) > -1

<h3><a name=isin> [chain] isin( array | lambda  )</a> [ <a href=#toc-finding>top</a> ] </h3>
*Also a top level function*

A macro lambda for find which tests for set membership. This is like the SQL "in" operator.  You can invoke it either
with a static array or a callback like so:

 * db.isin('months', ['jan','feb','march'])
 * db.isin('months', function(){ ... })

A usage scenario may be as follows:

db.find({months: db.isin(['jan', 'feb', 'march']));

<h3><a name=missing> [chain] missing( argList )</a> [ <a href=#toc-finding>top</a> ] </h3>
Missing is a macro lambda for find that can either be combined with find or called in a chain.  It will 
return records where ALL the fields supplied in the argList are missing.  For instance, if you have the following
records:

    { a: 1,
      b: 2,
      c: 3
    },
    { a: 4,
      b: 5
    },
    { a: 6 }

And ran the following:

    find(db.missing('c'))

You'd get the second and third record.  Similarly, if you did

    find(db.missing('c', 'b'))

You'd get an implicit "AND" and get only record 3.

<h3><a name=hasKey> [chain] hasKey( argList )</a> [ <a href=#toc-finding>top</a> ] </h3>
hasKey is simply <a href=#missing>missing</a> followed by an invert.  It's worth noting that this means it's implicitly an OR because ! A & B = A | B

<h3><a name=has> [chain] has( multi )</a> [ <a href=#toc-finding>top</a> ] </h3>
This is the reverse of isin.  If you do

db.insert({a: [1, 2, 3]})

You can do

db.find({a: db.has(1)})

<h3><a name=select> [chain] select( field(s) )</a> [ <a href=#toc-finding>top</a> ] </h3>
This will extract the values of a particular key from the filtered list
and then return it as an array or an array of arrays, depending on
which is relevant for the query.

You can also do db.select(' * ') to retrieve all fields, although the 
key values of these fields aren't currently being returned.

You can do 

 * select('one', 'two')
 * select(['one', 'two'])

But not:

select('one,two')

Since ',' is actually a valid character for keys in objects.  Yeah,
it's the way it is. Sorry.

<h3><a name=invert> [chain] invert( list )</a> [ <a href=#toc-finding>top</a> ] </h3>
Invert a set of results.

<h3><a name=view> [object] view( string )</a> [ <a href=#toc-finding>top</a> ] </h3>
Views are an expensive, unoptimized, naively implemented synchronization macro that return an object that can be indexed
in order to get into the data.  Don't use views if performance is required.  If keys aren't unique, then the value for 
the key is not defined (but not the undefined JS type).

example:

if db was [{a: 1}, {a: 2}, {a: 3}], doing db.view('a') will return an object like so:

    { 
      1: {a: 1},
      2: {a: 2},
      3: {a: 3}
    }

<h3>Notes</h3>

 * Unlike the other parts of the api, there's one option, a string, which will be the key for the hash.
 * This is similar to a group by, but the values are Not Arrays.
 * The values are direct tie ins to the database.  You can change them silently.  Use caution.
 * Deletion of course only decreases a reference count, so the data doesn't actually get removed from the raw db.
 * If you create N views, then N objects get updated each time.
 * The object returned will always be up to date.  At a synchronization instance
   * All the keys are discarded
   * The entire dataset is gone over linearly
   * The table is recreated.
   * This is about as expensive as it sounds.


<h2><a name=manipulating> Manipulating </a> [ <a href=#toc>top</a> ] </h2>

<h3><a name=each> [array] each( lambda ) </a> [ <a href=#toc-manipulating>top</a> ] </h3>
 *Aliased to map*
*Also a top level function*

The arguments for the lambda for each is either the return of a select as an array or the record
as a return of a find.

This is a convenience on select for when you do select('one','two')
and then you want to format those fields.  The example file included in the git repo has a usage of this.

<h3><a name=reduceLeft> [scalar] reduceLeft( memo, lambda | expression )</a> [ <a href=#toc-manipulating>top</a> ] </h3>
This is a macro lambda for each that implements a traditional functional list-reduction. You can use it like so:

    db.each( DB.reduceLeft(0, ' += x.value');

The y parameter is the iterated reduction and the x parameter is the record to reduce.  The second value, the
lambda function can either be a partial expression which will be evaluated to ('y = ' + expression) or it can
be a passed in lambda.

<h3><a name=reduceRight> [scalar] reduceRight( memo, lambda | expression ) </a> [ <a href=#toc-manipulating>top</a> ] </h3>
This is a right-wise reduction.  It is simply a left-wise with the input list being reversed.

<h3><a name=order> [array] order( multi ) </a> [ <a href=#toc-manipulating>top</a> ] </h3>
 *Aliased to sort*

This is like SQLs orderby function.  If you pass it just a field, then
the results are returned in ascending order (x - y).  

You can also supply a second parameter of a case insensitive "asc" and "desc" like in SQL.

Summary:

 * order('key')
 * order('key', 'asc')
 * order('key', 'desc')

**Note that the invocation styles above don't work on String values by default as of now.**
#### Callback based ordering
You can also do callback based sorting like so:

 * order('key', function(x, y) { return x - y } )
 * order(function(a, b) { return a[key] - b[key] })
 * order('key', 'x - y') *see below*

It's worth noting that if you are using the last invocation style, the
first parameter is going to be x and the second one, y.

<h3><a name=group> [map] group( field )</a> [ <a href=#toc-manipulating>top</a> ] </h3>
This is like SQLs groupby function. It will take results from any other function and then
return them as a hash where the keys are the field values and the results are a chained array
of the rows that match that value; each one supporting all the usual functions.

Note that the values returned do not update.  You can create a <a href=#view>view</a> if
you want something that stays relevant.

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


<h2><a name=storage> Storage </a> [ <a href=#toc>top</a> ] </h2>
What if you have an existing database from somewhere and you want to import
your data when you load the page.  You can supply the data to be imported
as an initialization variable.  For instance, say you are using [jStorage](http://www.jstorage.info/)
you could initialize the database as follows:

var db = DB($.jStorage.get('government-secrets'));

<h3><a name=sync> [handle] sync( callback ) </a> [ <a href=#toc>top</a> ] </h3>
To store the data when it is updated, you define a "sync" function.  Using our
jStorage example from above, we would 'sync' back to by doing the following:

db.sync( function(data) { $.jStorage.set('government-secrets', data); } )

The example file includes a synchronization function that logs to screen
when it is run so you can see when this function would be called.  Basically
it is done at the END of a function call, regardless of invocation.  That is
to say, that if you update 10 records, or insert 20, or remove 50, it would be
run, once, once, and once respectively.

If you run sync with no arguments then it will not add an undefined to the function
stack and then crash on an update; on the contrary, it will run the synchronization function stack; just as one would expect.

<h2><a name=example> Examples</a> [ <a href=#toc>top</a> ] </h2>

<h3><a name=ex-creation> Creation and Insertion</a> [ <a href=#toc>top</a> ] </h3>
Lets start with a trivial example; we will create a database and then
just add the object `{key: value}` into it.

    var db = DB();
    db.insert({key: value});

Now let's say we want to insert `{one: 1, two: 2}` into it

db.insert({one: 1, two: 2})

Alright, let's say that we want to do this all over again and now insert
both fields in.  We can do this a few ways:

1. As two arguments: `db.insert({key: value}, {one: 1, two: 2});`
2. As an array: `db.insert([{key: value}, {one: 1, two: 2}]);`
3. Or even chained: `db.insert({key: value}).insert({one: 1, two: 2});`


<h3><a name=ex-sql> SQL => DB examples </a> [ <a href=#toc>top</a> ] </h3>

<table>
  <thead>
    <tr>
      <th>SQL</th>
      <th>db.js</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>delete from users where lastlogin = false</td>
      <td>users.find({lastlogin: false}).remove()</td>
    </tr>
    <tr>
      <td>select * from people where id in ( select id from addresses where city like 'los angeles') order by income asc limit 10 offset 1</td>
      <td>people.find({ id: DB.isin( addresses.find( DB.like('city', 'los angeles') ).select('id') }).order('income').slice(1, 10)</td>
  </tbody>
</table>

<h3><a name=ex-more> More </a> [ <a href=#toc>top</a> ] </h3>

More examples can be found in the index.html in git repository.


<h2><a name=introduction>Introduction</a> [ <a href=#toc>top</a> ] </h2>

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

<h3><a name=syntax>Syntax Notes</a> [ <a href=#toc>top</a> ] </h3>
Great lengths have been taken to have a flexible and expressive API that
conforms to dynamic coding styles.

For instance, if you wanted to update 'key' to be 'value' for all records
in the database, you could do it like

db.update('key', 'value')

or

db.update({key: 'value'})

or you can chain this under a find if you want to only update some records

db.find({key: 'value'}).update({key: 'somethingelse'})

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


<h3><a name=support>Supported Platforms</a> [ <a href=#toc>top</a> ] </h3>

This has been tested and is known to work on

 * IE 5.5+
 * Firefox 2+
 * Chrome 8+
 * Safari 2+
 * Opera 7+

<h3><a name=dependencies>Dependencies</a> [ <a href=#toc>top</a> ] </h3>
none.

<h3><a name=performance>Performance</a> [ <a href=#toc>top</a> ] </h3>
Read [this comparison](https://github.com/danstocker/jorder/wiki/Benchmarks) by Dan Stocker. 

<h3><a name=license>License</a> [ <a href=#toc>top</a> ] </h3>
Dual-Licensed under MIT and GPL.

<h3><a name=contact>Contact</a> [ <a href=#toc>top</a> ] </h3>
[Join the mailing list](http://groups.google.com/group/dbjs).

<h3><a name=similar>Similar Projects</a> [ <a href=#toc>top</a> ] </h3>
Read [this comparison](https://github.com/danstocker/jorder/wiki/Benchmarks) by Dan Stocker. 

<h3><a name=alt>Browser-Based Alternatives</a> [ <a href=#toc>top</a> ] </h3>
Part of [HTML5](http://dev.w3.org/html5/webdatabase/#databases) may have SQL support in the land of future browsers.
But this is probably unlikely.  WebSQL, which is an SQL driver, usually just an interface to SQLite is being deprecated
in favor of a K/V store, IndexedDB which operates like a persistent hash with the following properties:

 * Schema-free
 * K/V based (as opposed to row)
 * Driven through DOM events
 * Does not use SQL.
 * Transactional (this implicates Cursors)
 * Mostly asynchronous and driven through events.
 * Supports unique indices 
 * Supports LINQ-style [ranges](https://developer.mozilla.org/en/IndexedDB/IDBKeyRange)

Here's where it's lacking

 * Mutator methods


<h3>Support</h3>

 * [Safari has supported WebSQL](http://www.webkit.org/blog/126/webkit-does-html5-client-side-database-storage/) for a while and is working on [indexedDB](https://github.com/NielsLeenheer/html5test/pull/68) support. 
 * [Chrome has had WebSQL support since version 4](http://www.infoq.com/news/2010/02/Web-SQL-Database) and used a [different interface](http://code.google.com/apis/gears/upcoming/api_database.html) prior to that.  IndexedDB support came in through [chromium](http://weblog.bocoup.com/javascript-indexeddb-in-chromium-8-0-552-5-dev).
 * [Firefox 4 had various interfaces](http://hacks.mozilla.org/2010/06/comparing-indexeddb-and-webdatabase/) but apparently only [indexedDB](https://developer.mozilla.org/en/IndexedDB) is supported at this time.
 * [Opera 11 has IndexedDB support](http://dev.opera.com/articles/view/taking-your-web-apps-offline-web-storage-appcache-websql/).
 * [Internet Explorer 9 has IndexedDB support](http://msdn.microsoft.com/en-us/scriptjunkie/gg679063) tentatively.

<h3><a name=users>Users</a> [ <a href=#toc>top</a> ] </h3>
If you use this library, let me know on the mailing list or through github!

Current users:

 * [iizuu](http://www.iizuu.com) uses the library extensively
 * [ytmix](https://github.com/kristopolous/ytmix) a data drive youtube application
