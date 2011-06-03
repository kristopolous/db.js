# Javascript Database

[Join the mailing list](http://groups.google.com/group/dbjs)

[See the Demo](http://qaa.ath.cx/db/test.html)

Before you go further, read [this comparison](https://github.com/danstocker/jorder/wiki/Benchmarks) by Dan Stocker.  My solution although better than Taffy and JLinq seems to not be as good as Mr. Stocker's Jorder.  Perhaps you will like my syntax, or perhaps you will like his speed.

## This will be painless, I assure you.

Have you ever thought "gee this problem is tough. if only I had an SQL database to run queries on, in the browser, like an SQLite for JS, life would be easy".

Sure, this may be available as a subsystem in fancy new-age browsers (see below) but what about the other 80% of the market? And what if you want to do things in a javascripty way?

Well, look no further comrade, the purpose of this project is to make something that can be described as:

## It's basically SQL, but in the browser.

Let me show you how awesome this can be.
Take a familiar SQL query like this:

`select firstname, age from people where age > 30 order by age desc`

And with a little bit of javascripty magic, we can do this:

    people
      .find(DB('age', '> 30'))
      .order('age', 'desc')
      .select('firstname', 'age')

And bam! There you go. Who said life wasn't easy?

### Ok, but before we go on, does it work in IE 6?
yes.

### 5.5?
sure.

### Netscape 4?
no. sorry. not that one.

### Ok, that last one was a joke.  But seriously, this looks kinda different from SQL; I'm totally confused already.

Stop.  Breath slowly and relax.  It will all be ok. I tried
my best to make it easy to wrap your head around (I'm pretty dumb and
I get it).

Just remember these two simple rules:

1. First filter your search results to the entries you are interested in. In SQL land, this would usually go in the "where" clause.  I call it "find" to make it more of a verb then an proposition. But if you REALLY want to use "where", it's aliased for you cause I hate being imposing.

2. Ok, after you have your items of interest you can now run various operations on those filtered results.  For instance, you can remove them, or update them, or show some records of them.

**tl;dr**

1. Do your "SQL where" stuff first.
2. Everything else second.

## Do I need JQuery or mootools or something like that?
lolz, no! Of course not. Why would I do something like that?

## Are you using one of those GNU-esque liscenses that prevents me from using it at my place of employment?
no. Do whatever you want with it; Sell it for profit, fine by me.  I built it for myself.  Do what you want ; so long as you don't try to assume all rights of course; let's call it BSD.

## Removing all barriers to entry
I have horrible memory and can never recall how to use an API.  So,
I think of every possible way that a slouch like me would ever attempt
to use it, and I make sure I support all of them.

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
arbitrary functions to Array.prototype.  I mean, you should be doing
`for (i = 0; i < res.length; i++)` as opposed to `for (i in res)` in
order to be good; but you are doing that for arrays already right? Ok,
good, no problems then.

### Ok, but I have an existing system with lots of stuff I wrote before I read about this.  I don't want to retrofit your code on my existing stuff.

**You Don't Have To!**

All you need is an Array of Objects.  For instance, say I have an existing array like this:

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

And you are like "Well, this find and select thing is really neat.".  Great! Here you go:

    DB(something_i_dont_have_time_to_rewrite)
      .find({name: 'something else'})
      .select('node')

That's right.  The magic sauce will work on existing old fashioned objects with full force!

**What about something like**

    DB.find(
      document.getElementsByTagName(' * '), 
      db.like('innerHTML', 'hello World')
    )

Yes, that will work also. 

## API

### db.insert( rows )
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

### db.find( constraint )
This is like the "where" clause in SQL.  You
can either invoke it for standard comparison like 

 * `find({key: 'value'})`
 * `find('key', 'value')`

or you can have a conditional; which is pure magic.

 * `find({key: function(value) { return value < 10; })`

Since that syntax is a bit tedious, there is a shorthand form:

 * `db.find({key: db('< 10')})`

This creates the above function for you.  You can also be even more
terse with the library, if you are in an inexplicable hurry:

 * `db.find(db('key', '< 10'))`

However, the one thing that you cannot do (yet) is this:

 * `db.find(db('key < 10'))`

I really want this to be possible in a magical safe way and see it
as one of the primary objectives going forward.

#### db.like( string )
This is like SQL like command and it takes the value and does

 `value.toString().toLowerCase().search(query.toString().toLowerCase) > -1`

which is a mouthful.

#### db.isin( multi )
This is like the SQL "in" operator, which is a reserved JS word.  You can invoke it either
with a static array or a callback like so:

 * `db.isin('months', ['jan','feb','march'])`
 * `db.isin('months', function(){ ... })`

A usage scenario may be as follows:

`db.find({months: db.isin(['jan', 'feb', 'march']));`   

#### db.has( multi )
This is the reverse of has.  If you do

`db.insert({a: [1, 2, 3]})`

You can do

`db.find({a: db.has(1)})`


#### But dude, why do I have to do this db() crap?
That's because `key < 10` is actually a valid string, of course. It
gives rise to the ambiguity, "is that an expression?".  Wrapping it
removes this ambiguity so that you don't have collisions.

### db.remove( constraint )
This will remove the entries from the database but also return them if
you want to manipulate them.  You can invoke this with a constraint.

### db.select( field(s) )
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

#### db.each(function)
This is more of a convenience on select for when you do select('one','two')
and then you want to format those fields.  The example html file called
example.html included in the git repo has a usage of this.

### db.order(multi)
This is like SQLs orderby function.  If you pass it just a field, then
the results are returned in ascending order (x - y).  

You can also supply a second parameter of a case insensitive "asc" and "desc" like in SQL.

Summary:

 * `order('key')`
 * `order('key', 'asc')`
 * `order('key', 'desc')`

**Note that the invocation styles above don't work on String values by default as of now.**

#### Callback based ordering
You can also do callback based sorting like so:

 * `order('key', function(x, y) { return x - y } )`
 * `order(function(a, b) { return a[key] - b[key] })`
 * `order('key', 'x - y')` *see below*

It's worth noting that if you are using the last invocation style, the
first parameter is going to be x and the second one, y.

### db.update(field)
In regular SQL you may find yourself doing something like this:

`update employees set fired = true where tardydays > 40`

Here's how you pull that off here:

`employees.find(employees('tardydays', '> 40')).update({fired: true})`

See again, how you do the noun first, that is, describe the data you
want to be working on, and then describe the operations that you want
to do to them.

### db.inverse(list)
Invert a set of results.

### db.constrain(type, value)
This is to constrain the database.  Currently you can enforce a unique
key value through something like `db.constrain('unique', 'somekey')`.
You should probably run this early, as unlike in RDBMSs, it doesn't do
a historical check nor does it create a optimized hash to index by
this key ... it just does a lookup every time as of now.

## Persistance and Synchronization
### Loading
What if you have an existing database from somewhere and you want to import
your data when you load the page.  You can supply the data to be imported
as an initialization variable.  For instance, say you are using [jStorage](http://www.jstorage.info/)
you could initialize the database as follows:

`var db = DB($.jStorage.get('government-secrets'));`

### Storing
To store the data when it is updated, you define a "sync" function.  Using our
jStorage example from above, we would 'sync' back to by doing the following:

`db.sync( function(data) { $.jStorage.set('government-secrets', data); } )`

The file "example.html" includes a synchronization function that logs to screen
when it is run so you can see when this function would be called.  Basically
it is done at the END of a function call, regardless of invocation.  That is
to say, that if you update 10 records, or insert 20, or remove 50, it would be
run, once, once, and once respectively.

## Examples
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

## Caveats

 * There's no notion of joining although it probably wouldn't be that hard.
 * Values CANNOT BE functions ... I don't see this changing unless people whine

## Similar Projects
Since starting this project, people have brought other, similar products
to my attention: 

 * [TaffyDB](http://taffydb.com/)
 * [jLinq](http://www.hugoware.net/Projects/jLinq)

## Doesn't HTML5 support this?
Alan Chen pointed me to part of [HTML5](http://dev.w3.org/html5/webdatabase/#databases) that appears to claim that there will be full SQL support in the land of future browsers, maybe.

There's two interfaces, "IndexedDB" and "WebSQL".  As always, the browser world seems to be split.

 * [Safari has supported WebSQL](http://www.webkit.org/blog/126/webkit-does-html5-client-side-database-storage/) for a while and is working on [indexedDB](https://github.com/NielsLeenheer/html5test/pull/68) support. 
 * [Chrome has had WebSQL support since version 4](http://www.infoq.com/news/2010/02/Web-SQL-Database) and used a [different interface](http://code.google.com/apis/gears/upcoming/api_database.html) prior to that.  IndexedDB support came in through [chromium](http://weblog.bocoup.com/javascript-indexeddb-in-chromium-8-0-552-5-dev).
 * [Firefox 4 had various interfaces](http://hacks.mozilla.org/2010/06/comparing-indexeddb-and-webdatabase/) but apparently only [indexedDB](https://developer.mozilla.org/en/IndexedDB) is supported at this time.
 * [Opera 11 has IndexedDB support](http://dev.opera.com/articles/view/taking-your-web-apps-offline-web-storage-appcache-websql/).
 * [Internet Explorer 9 has IndexedDB support](http://msdn.microsoft.com/en-us/scriptjunkie/gg679063) tentatively.

### Making an argument then, for this library
I must concede, I didn't know about this world prior to implementing this.  However, given this, there are still benefits in using an interface such as this:

 * It's in vanilla JavaScript 1.5, without DOM; so it should work in any major browser made within the past 13 years whereas the stuff above appears experimental for most of the browsers
 * It would not be difficult to reduce the interfacing down to SQL in order to interface the web storage systems out there.
 * The library is more of a hybrid between a document store and a traditional RDBMS.  For instance:
  * Schemas aren't required
  * It's loosely typed

As a result, it (the library) tries to address specific classes of problems more than be a strict accessor to an SQL sub-system.

[Join the mailing list](http://groups.google.com/group/dbjs)
