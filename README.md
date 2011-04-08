# A Generic Javascript Database

## This will be painless, I assure you.

Recently I had a very intricate and nuanced problem I had to solve.  I thought "gee, if only I had an SQL database to run queries on, in the browser, like an SQLite for JS, life would be easy".

Much to my delight, this wasn't that hard.  The purpose of this project
is to make something that can be described as:

# It's basically SQL, but in the browser.

Lets start by doing an SQL query and show you how you can do it here:

`select firstname, age from people where age > 30 order by age desc`

Pretty straightforward, right?  In this library, you have to rearrange
your thinking a little bit, but not by much.  We can get the same ends
by doing the following:

`people.find(db('age', '> 30')).order('age', 'desc').select('firstname','age')`

The proper way to think about this is

1. You first filter your search results to the entries you 
are interested in. You can do this in a chained way, such as this:

`db.find({key: value, key1: value}).find({key: db('!== undefined')})`

2. Now you have a subset of data that you can work with.  You can run
a number of familiar commands on it. 

# But wait, first a note about the parameters
I believe in expressive freedom.  Really.  That means that you can invoke
this library in many ways.  For instance, if you wanted to update 'key'
to be 'value', you could do it like

`update('key', 'value')` 

or

`update({key: 'value'})`

You can chain this under a find like

`db.find().update(blah blah)`

or drop it all together

`db.update(blah blah)`

The basic idea is that **you are using this API because you want life
to be painless and easy**.  You certainly don't want to wade through
a bunch of documentation or have to remember strange nuances of how
to invoke something.  You should be able to take the cavalier approach and
*Get Shit Done(tm)*.

Now without further ado, moving on:

## db.remove()
This will remove the entries from the database but also return them if
you want to manipulate them.

## db.select(field)
This will extract the values of a particular key from the filtered list
and then return it as an array or an array of arrays, depending on
which is relevant for the query.

You can also do db.select(' * ') to retrieve all fields, although the 
key values of these fields aren't currently being returned.

## db.update(field)
In regular SQL you may find yourself doing something like this:

`update employees set fired = true where tardydays > 40`

Here's how you pull that off here:

`employees.find(db('tardydays', '> 40')).update({fired: true})`

See again, how you do the noun first, that is, describe the data you
want to be working on, and then describe the operations that you want
to do to them.

# Creation and Insertion
Lets start with a trivial example; we will create a database and then
just add the object `{key: value}` into it.

`var db = DB();
db.insert({key: value});
`

Now let's say we want to insert `{one: 1, two: 2}` into it

`db.insert({one: 1, two: 2})`

Alright, let's say that we want to do this all over again and now insert
both fields in.  We can do this a few ways:

1. As two arguments: `db.insert({key: value}, {one: 1, two: 2});`
2. As an array: `db.insert([{key: value}, {one: 1, two: 2}]);`
3. Or even chained: `db.insert({key: value}).insert({one: 1, two: 2});`

# Persistance and synchronization
What if you have an existing database from somewhere and you want to import
your data when you load the page.  You can supply the data to be imported
as an initialization variable.  For instance, say you are using [jstorage](http://www.jstorage.info/)
you could initialize the database as follows:

`var db = DB($.jStorage.get('government-secrets'));`

## Synchronization
To store the data when it is updated, you define a "sync" function.  Using our
jStorage example from above, we would 'sync' back to by doing the following:

`db.sync = function(data) { $.jStorage.set('government-secrets', data); }`

The file "test.html" includes a synchronization function that logs to screen
when it is run so you can see when this function would be called.  Basically
it is done at the END of a function call, regardless of invocation.  That is
to say, that if you update 10 records, or insert 20, or remove 50, it would be
run, once, once, and once.


# Further SQL to DB Examples
`remove from users where lastlogin = false`

becomes:

`users.find({lastlogin: false}).remove();`

# Caveats
 * There's no notion of joining although it probably wouldn't be that hard.

# Similar Projects
Since starting this project, people have brought other, similar products
to my attention: 

 * [TaffyDB](http://taffydb.com/)
 * [jLinq](http://www.hugoware.net/Projects/jLinq)

