<h1><a name=toc> Javascript `Databank`</a>

### <a href=#introduction>The adventures of Agnes and Frederick</a>
 * <a href=#expressions>Expressions</a>
 * <a href=#browser>KISS syncing</a>
 * <a href=#autoincrement>AutoIncrement</a>
 * <a href=#mutation>Restructuring data</a>
 * <a href="http://9ol.es/ytwatch1">The Project This is Primarily Built For</a>

### <a name=toc-inserting href=#inserting>Inserting and Removing</a> records

 * <a href=#initialization>Initialization</a> a new database
 * <a href=#transforming>Transforming</a> existing data
 * <a href=#insert>Insert</a> new records
 * <a href=#mutator>Mutator</a> functions as values
 * <a href=#template>Template</a> based insertion
 * <a href=#update>Update</a> existing records
 * <a href=#unset>Unset</a> existing keys
 * <a href=#remove>Remove</a> records and get a copy of them
 * <a href=#constrain>Constrain</a> insertion by a unique, primary key
 * <a href=#addif>AddIf</a> and only if something matches a test
 * <a href=#beforeadd>BeforeAdd</a> to sanitize and cleanup data prior to insertion

### <a name=toc-finding href=#finding>Finding</a> and searching for data

 * <a href=#find>find</a> records through an expressive syntax
 * <a href=#findFirst>findFirst</a> record through an easy syntax
 * <a href=#not>not</a> records that match the condition
 * <a href=#like>like</a> finds records by substring
 * <a href=#isin>isin</a> finds whether the record is in a group
 * <a href=#has>has</a> looks inside a record stored as an array
 * <a href=#missing>missing</a> records that have keys not defined
 * <a href=#hasKey>hasKey</a> finds records that have keys defined
 * <a href=#select>select</a> one or more fields from a result
 * <a href=#invert>invert</a> gets the unary inverse of a set of results
 * <a href=#slice>slice</a> the records while maintaining the function chain
 * <a href=#view>view</a> data easily (or <a href=#lazyView>lazily</a>)

### <a name=toc-manipulating href=#manipulating>Manipulating</a> retrieved data

 * <a href=#each>each</a> or <a href=#each>map</a> results to new values
 * <a href=#reduceLeft>reduceLeft</a> results to aggregate values
 * <a href=#reduceRight>reduceRight</a> results to aggregate values
 * <a href=#order>order</a> or <a href=#order>sort</a> results given some function or expression
 * <a href=#group>group</a> results by some key
 * <a href=#keyBy>keyBy</a> a certain key to make a 1-to-1 map
 * <a href=#indexBy>indexBy</a> to re-index the database by a sort constraint.

### <a href=#storage>Storage</a> options to importing and expoting data

 * <a href=#sync>sync</a> the database when things are modified
 * <a href=#transaction>transaction</a> to help reduce expensive indexing

### <a href=#example>Examples</a>
 
 * <a href=#ex-creation>Creating and Inserting</a>
 * <a href=#ex-sql>SQL to DB example</a>
 * <a href=#ex-more>More</a>

### Miscellaneous non-awesome stuff
 * <a href=#buzzword>Buzzword Compliance</a>
 * <a href=#syntax>Syntax notes</a>
 * <a href=#support>Supported Platforms</a>
 * <a href=#dependencies>Dependencies</a>
 * <a href=#performance>Performance</a>
 * <a href=#license>License</a>
 * <a href=#contact>Contact</a>
 * <a href=#similar>Similar Projects</a>
 * <a href=#users>Users</a>

<h2><a name=introduction></a>Agnes and Frederick [ <a href=#toc>top</a> ] </h2>

We will follow two groups in our exploration: 

  * Two time travellers from the 1700s 
  * A secret agency of spies that are out to get them.

The time travellers have hacked into the spy's communication systems, but only have a browser to work with.  The schema is a mess and they must make sense of it and find out what the spies know in order to escape their wrath.

We start our story shortly after they have discovered the large dataset.

<blockquote>
Agnes: Why dearest me, Sir Frederick, this data manipulation dilemma is truly proving to be quite intractible. If only I or one such as me had for our immediate disposal and use **an expressive and flexible** syntax; much akin to SQL - for the use in the Browser or in other Javascript environments: then, we could resolve the issues that are contained within this problem with a great ease - indeed, that of which would be immeasurable and truly beneficial to the cause at hand.</blockquote>

Let's take a familiar everyday SQL query such as:

    select spyname, location
      from hitlist
      where 
        target_time < NOW() and
        alive == true
      order by distance desc

Dance around a bit...

    from hitlist
      where 
        target_time < NOW() and
        alive == true
      order by distance desc
      select spyname, location

Add some commas, a few parenthesis, lots of black magic, and here we go:

    hitlist
      .where(
        'target_time < new Date()',
        'alive == true'
      )
      .order('distance', 'desc')
      .select('spyname', 'location')
      .each(function(row) {
        console.log(
          row.spyname + ", you have moments to live." +
          "They know you are at " + row.location "." +
          "Use rule 37."
        );
      });

Who said life wasn't easy, my dear Frederick?

<h3><a name=expressions>Expressions</a> [ <a href=#toc>top</a> ] </h3>
Expressions are the *biggest, most important part here*. 

Let's go back to our coders. They have now created a bunch of underscore, jquery, and backbone mess of select, without, uniq, and other weird things to manipulate their data.  They are getting nowhere.

One of them says:

<blockquote>
Agnes: Sir Frederick, whilst looking at the code, one is apt to imagine that she is perusing some ill-written tale or romance, which instead of natural and agreeable images, exhibits to the mind nothing but frightful and distorted shapes "Gorgons, hydras, and chimeras dire"; discoloring and disfiguring whatever it represents, and transforming everything it touches into a monster.</blockquote>

Let's clean up that mess.

Expressions are a processing engine where you can toss in things and get matching functions.

For instance, say you want to find out what parts of your complex object datastore has a structure like this:

    { 'todo': { 'murder': <string> } } 
        
Agnes and Frederick have found this:

      { 'name': "Agnes",
        'location': 'Starbucks',
        'role': 'target',
        'kill-date': 'today',
        'hitmen' : ['Agent 86']
      },
      { 'name': "Agent 86",
        'role': 'spy',
        'distance': 80000,
        'todo': { 'murder': 'Agnes' }
      },
      { 'name': "Agent 99",
        'role': 'spy',
        'backup-for': ['Agent 86', 'Agent Orange']
      },
      { 'name': "Frederick",
        'role': 'target',
        'location': 'Starbucks',
        'kill-date': 'today',
        'hitmen' : ['Agent 86', 'Agent Orange']
      },
      { 'name': "Agent 007",
        'role': 'spy',
        'todo': { 'sleep-with': 'spy' }
      },
      { 'name': "Agent Orange",
        'distance': 10000,
        'role': 'spy',
        'todo': { 'murder' : 'Frederick' },
      },

We want to find out a few things:

    DB.find([
      DB('.todo.murder == "Frederick"),
      DB('.todo.murder == "Agnes")
    ])

Gets you there, the Array means OR. Now they want to manipulate it further.

    DB.find({
      'role': 'target',
      'kill-date': 'today'
    }).update({
      'location': 'across town'
    }); 

There's a backup agent, Agent 99, to be used in case the other two fail. Agnes and Frederick want to foil her:

    DB.find({
      'backup-for': DB.find(
        DB('.todo.murder.indexOf(["Frederick", "Agnes"]) > -1')
      ).select('name')
    ).update(function(who) {
      delete who['backup-for'];
      who.todo = 'lie around and sun bathe';
    });

They find that there is a lot more to explore, try

    DB(some string).toString()

to peek at the implementation.  This is how they got started:

    DB(".a.b")({a:{c:1})
    >> undefined

    DB(".a.b")({a:{b:1})
    >> 1

    DB(".a.b")({b:{b:1})
    >> undefined

    DB(".a.b")({a:{b:[1,2,3]})
    >> [1,2,3]

To debug their expressions. Much to their delight, they found they can use these expressions and data manipulations just about everywhere in this library of black magic.

<h3><a name=browser>KISS syncing in the browser</a>[ <a href=#toc>top</a> ] </h3>

Our heros are now finally getting somewhere. They can bring down their data, and manipulate it with ease.

<blockquote>Frederick: A world of hope is but a few keystrokes away for us Agnes. However, I haven't uncovered a painless way to remove our true information, place in plausibly fraudulant information, and then automatically update the remote database with ease --- surely, there must be a way to trigger a function when our data-bank is manipulated.</blockquote>

Going to the documentation, they find a convenient <a href=#sync>sync</a> function that is designed to do just that. Returning to their [laptop](http://24.media.tumblr.com/tumblr_lokdial9rE1r01d4bo1_1280.jpg):

    var what_it_is_that_we_know = DB().sync(function(espionage_dataset) {
      $.put("/government-secrets", espionage_dataset);
    });

    $.get("/government-secrets", what_it_is_that_we_know);

And it's done. **Now Agnes and Frederick can modify stuff in the browser and it automatically does a remote sync**.  It was 4 lines. That's really all it took.

<h3><a name=autoincrement>AutoIncrement</a>[ <a href=#toc>top</a> ] </h3>

Agnes and Frederick are in the clear for now. However, this isn't to last long

<blockquote>Agnes: Wouldn't it be a wonderful, and I do mean quite a pleasant reality if we had a more organized way of dealing with this immensely distraught set of information.  If we could automatically decorate the data for our own purposes; through auto-incrementing or other things. This would make our lives easier.</blockquote>

Reading through the docs, Frederick finds that <a href=#template>Templates</a> can be used to create auto-incrementers. 

    var 
      index = 0,
      our_copy = DB();

    our_copy.template.create({id: (function(){ return index++; })});

    our_copy.insert(spies_database);

    >> our_copy.find()
    
      { 'id': 0,
        'name': "Agnes",
        'location': 'Starbucks',
        'role': 'target',
        'kill-date': 'today',
        'hitmen' : ['Agent 86']
      },
      { 'id': 1,
        'name': "Agent 86",
        'role': 'spy',
        'distance': 80000,
        'todo': { 'murder': 'Agnes' }
      }
      ...

This is quite pleasant, they think. But still not very useful.  Wouldn't it be nice if they could just find out who the spies are?
<h3><a name=mutation>Restructuring data</a>[ <a href=#toc>top</a> ] </h3>

<blockquote>Frederick: Really what we need is a way to group people.</blockquote>

After exploring some more, they find <a href=#group>group</a> and write this:

    spies_database.group("role")

    { 'spy': [
        { 'name': "Agent Orange",
          'distance': 10000,
          'role': 'spy',
          'todo': { 'murder' : 'Frederick' },
        },
        { 'name': "Agent 007",
          'role': 'spy',
          'todo': { 'sleep-with': 'spy' }
        }
      ]...
    { 'target': [
        { 'name': "Frederick",
          'role': 'target',
          'location': 'Starbucks',
          'kill-date': 'today',
          'hitmen' : ['Agent 86', 'Agent Orange']
        },
        { 'name': "Agnes",
          'location': 'Starbucks',
          'role': 'target',
          'kill-date': 'today',
          'hitmen' : ['Agent 86']
        }
      ]
    } 

Now they are getting somewhere they say:

    DB(
      spies_database.group("role")
    ).find(DB("target.name == 'Agnes'"));

They become quite pleased with how easy it is to do things.

<!--
<h3><a name=magic>Magical updating hash maps</a>[ <a href=#toc>top</a> ] </h3>

Pretend I have a backbone model that has some defaults and I want to find an object that has a certain attribute equalling a certain value.

Well we can do this easily here:

    var magicalview = db.view('myattribute');

    magicalview['certainvalue']

Will work.  In fact, **it updates automatically**. How convenient - I can get the whole keyspace and do a bunch of object like things on it. Besides, I always hated to press the shift `()` keys anyway.

<h3><a name=dom>DOM serialization</a>[ <a href=#toc>top</a> ] </h3>

You don't need to insert things into a database first, you can just do something like this:

    $.post("/proxy.to/http://shadypeople.ru",

      DB.find(

        document.getElementsByTagName(' * '), 
        db.like('innerHTML', 'password')

      ).select('innerHTML')

    );

-->
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

#### Inserting on a database with constraints

If you have a constrained unique key and are inserting entries which 
would conflict with the key, the return value is the inserted data
intersperesed with existing data and a list of the fields which caused
a failed to insert.

For example, if there was a unique constraint of "id" and the existing
data was

    db = [
      { id: 1, a:1 }
      { id: 2, a:1 }
      { id: 3, a:1 }
    ]

And we run

    var ret = db.insert([
      { id: 0, b:1 },
      { id: 1, b:1 },
      { id: 2, b:1 },
      { id: 3, b:1 },
      { id: 5, b:1 }
    ]); 

Then ret.existing would have the content of

    [1, 2]

And ret itself would be:

    { id: 0, b:1 },

    { id: 1, a:1 }, << the existing record.
    { id: 2, a:1 }, << the existing record.

    { id: 3, b:1 },
    { id: 5, b:1 }

#### Inserting by Reference

Normally insert is a copy, but you can also simulate an insert by reference by doing a reassignment:

    data = db.insert(data)[0];
    data.newkey = value;
    db.find({newkey: value});

would work.


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

If you run a `db.find({key: 0})` on this then the function will be run, returning the value at its initial state.  In this
case it would be 0.

Semantically, the update will now pass in a value, as mentioned above.  So if you do something like:

    db.update({key: 4});

Now the value in the closure will be "4" and a db.find({key: 4}) will return.

<h3><a name=template> Templates </a> [ <a href=#toc-inserting>top</a> ] </h3>
Templates permit you to have a set of K/V pairs or K/lambda pairs that act as a baseline for record insertion.  You can create, update, get, and destroy templates.  They are not retroactive and only affect insertions that are done after the template is created.

The template itself is implicit and modal; applying to all insertions until it is modified or removed.

 
<h5>Creation</h5>

To create a template use `template.create( fields )`

<h5>Update</h5>

Updating overwrite previous values as specified whilst retaining the old values of those which are not.  To update a template use `template.update( fields )`

<h5>Getting</h5>

You can get the current template with `template.get()`

<h5>Destroy</h5>

You can destroy a template with `template.destroy()`

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

<h3><a name=unset> [chain] unset( key | [key1, key2, ... keyN] )</a> [ <a href=#toc-inserting>top</a> ] </h3>
Unsets the keys in the find clause or over the entire db. Returns a chain.

<h3><a name=remove> [chain] remove( object | lambda | [ key, value ] )</a> [ <a href=#toc-inserting>top</a> ] </h3>
This will remove the entries from the database but also return them if
you want to manipulate them.  You can invoke this with a constraint.

<h3><a name=constrain> constrain( type, value ) </a> [ <a href=#toc-inserting>top</a> ] </h3>
This is to constrain the database.  Only unique types are supported.

You can enforce a unique key value through something like `db.constrain('unique', 'somekey')`.
You should probably run this early, as unlike in RDBMSs, it doesn't do
a historical check nor does it create a optimized hash to index by
this key ... it just does a lookup every time as of now.

Additionally, if a failure to insert happens, then the insert returns the *conflicting* entry (see below)
<b>Example:</b>

    db.constrain('unique', 'uuid');

    var val = db.insert(
      {uuid: '1384e53d', data: 'xyz'}, // This will go in
      {uuid: '1384e53d', data: 'abc'} // This will not.
    );

    // Now val will be
    val = [
      // This was inserted correctly
      {uuid: '1384e53d', data: 'xyz'}, 

      // The second value was not inserted - it conflicted with the 
      // first value, which is here:
      {uuid: '1384e53d', data: 'xyz'}
    ];


<h3><a name=addif> addIf ( function (candidate) ) </a> [ <a href=#toc-inserting>top</a> ] </h3>
Specify a function that will get the candidate object to be added and return either true or false
specifying (true) to add it or (false) to not.  This feature was added to implement blacklisting.

When you run addIf with or without arguments you get an array of the functions back.  You can then
splice, shift, pop, push, or unshift the array to do those respective functions.

<h4>Example:</h4>

    db.addIf(function(what) {
      return ('key' in what);
    });

    db.insert(
      {key: 'value'}, // This will go in
      {foo: 'bar'} // This will not.
    );

    db.addIf().pop(); // This will remove the constraint

<h3><a name=beforeadd> [array] beforeAdd ( function ( entry ) ) </a> [ <a href=#toc-inserting>top</a> ] </h3>
beforeAdd allows you to mutate (or modify) data prior to inserting it.  This is effectively an event
or a 'middleware' that permits you to do things like type casting or OOB accounting prior to something
existing in the database.  See <a href=#sync>Syncing</a> for after-style events.

It returns a list of the callbacks that are being run ... 

<h4>Example:</h4>

Say we get dates from a database as string values and want to convert them to javascript Dates prior to insertion (so that we 
can sort and filter by them).  Here is how you may achieve that (this is taken from a project using laravel blade templating
on a table with timestamps enabled):

    @section('js')
    var db = DB();
     
    db.beforeAdd(function(entry) {
      _.each(['created_at','updated_at'], function(what) {
        entry[what] = new Date(entry[what]);
      }); 
    });
     
    db.insert({{ $data }});
    @endsection


<h4>Implementation Notes</h4>
beforeAdd is a light wrapper around <a href=#addif>addif</a> which exploits the fact that candidates come in as
a reference and can be modified.  It provides a semantically distinct function at a level that is nearly equivalent
in implementation.

<h4>Example:</h4>

    db.beforeAdd(function(what) {
      what.length = parseInt(what.length, 10);
      what.name = unescape(what.name);
    });

    db.insert({
      length: "123",
      name: "Alice%20and%20Bob"
    });

    db.find() ->
      [ {
          length: 123,
          name: "Alice and Bob"
      } ]
 
<h2><a name=finding> Finding </a> [ <a href=#toc>top</a> ] </h2>

<h3><a name=find> [chain] find( object | lambda | [key, value] )</a> [ <a href=#toc-finding>top</a> ] </h3>
*Also a top level function*

This is like the "where" clause in SQL.  You
can invoke it one of the following ways:

 * by Object: `find({key: 'value'})`
 * by ArgList: `find('key', 'value')`
 * by record Function: find(function(record) { return record.value < 10; })`
 * by key Function: `find({key: function(value) { return value < 10; })`
 * by key Expression: `find({key: db('< 10')})`
 * by anonymous Expression: `find(db('key', '< 10'))`

<h4>Return value</h4>

find returns a reference to the objects in the table in an array.  As a convenience two additional
properties are always set:

 * first: corresponding to the first result, ie, `[0]`
 * last: corresponding to the last result, ie, `slice(-1)[0]`

<h4>Booleans</h4>

<h5>And</h5>
In order for things to match multiple conditions, provide those conditions as arguments to find.  
For instance, if you want to find things where "a = 1" **AND** "b = 1" you could do:

    find(
      {a: 1},
      {b: 1}
    );

which is equivalent to

    find({a: 1}).find({b: 1})

<h5>Or</h5>
Or is nearly identical to And but you wrap the arguments in an array. 
For instance, if you want to find things where "a = 1" **OR** "b = 1" you could do:

    find(
      [
        {a: 1},
        {b: 1}
      ]
    );

You can also use the Or semantics to find multiple keys equaling a value at once.  For instance, the 
previous query could have been written as 

    find(
      [ 'a', 'b' ],
      1
    );

<b>Not</b>

Not is handled in its own <a href=#not>wrapper function</a>

<b>Xor</b>

lol, yeah right. what would that even mean?

<h5>isArray</h5>

Normally a query such as `find({key: ['v1', 'v2', 'v3']});` is treated as "is key one of either v1, v2, or v3".  If, instead,
you'd like to look for the array `['v1', 'v2', 'v3']` use `DB.isArray`, for instance:

    var db = DB({key: [1,2,3]});

    db.find({key: [1,2,3]})  -> false

    db.find({key: DB.isArray([1,2,3])}) -> true


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
<s>**Please note that findFirst ALWAYS returns an object.  If there was no match
then the returned object is empty.**</s>

<b>Changed on 2015-05-04</b>. Now findFirst returns the boolean `false` if nothing is found.

<h3><a name=like> [chain] like( string | argList )</a> [ <a href=#toc-finding>top</a> ] </h3>
A macro lambda for find that does a case-insensitive regex search on the values for keys.
This is similar to the SQL like command and it takes the value and does

    value
      .toString()
      .toLowerCase()
      .search(
        query
          .toString()
          .toLowerCase
      ) > -1

<h3><a name=not> [chain] not( lambda )</a> [ <a href=#toc-finding>top</a> ] </h3>
A wrapper function that returns the boolean inverse of the function passed in.  You can use it in combination with many
other function like so:

  db.find({
    a: db.not(
      db.isin([ 1, 2, 3 ])
    )
  })

<h3><a name=isin> [chain] isin( array | lambda  )</a> [ <a href=#toc-finding>top</a> ] </h3>
*Also a top level function*

A macro lambda for find which tests for set membership. This is like the SQL "in" operator.  You can invoke it either
with a static array or a callback like so:

 * `db.isin('months', ['jan','feb','march'])`
 * `db.isin('months', function(){ ... })`

A usage scenario may be as follows:

    db.find({months: db.isin(['jan', 'feb', 'march']));

There's also a shortcut available by just providing an array as an argument. The previous query could have 
been written as:

    db.find({months: ['jan', 'feb', 'march']});

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

You can also do `db.select(' * ')` to retrieve all fields, although the 
key values of these fields aren't currently being returned.

You can do 

 * `select('one', 'two')`
 * `select(['one', 'two'])`

But not:

    select('one,two')

Since ',' is actually a valid character for keys in objects.  Yeah,
it's the way it is. Sorry.

<h3><a name=invert> [chain] invert( list )</a> [ <a href=#toc-finding>top</a> ] </h3>
Invert a set of results.

<h3><a name=slice> [chain] slice( [Array.prototype.slice options] )</a> [ <a href=#toc-finding>top</a> ] </h3>
This is a direct map of slice from Array.prototype with the addition of permitting a chaining of events after the slice.
This is useful if for example, you want to apply a function to only the first 10 results of a find.

<h4>Example:</h4>

    db.find({
      condition: true
    }).select('field')
      .slice(0, 10)
      .each(some_operation);

<h3><a name=view> [object] view( string )</a> [ <a href=#toc-finding>top</a> ] </h3>
Views are an expensive, unoptimized, naively implemented synchronization macro that return an object that can be indexed in order to get into the data.  Don't use views if performance is required.  If keys aren't unique, then the value for the key is not defined (but not the undefined JS type).

example:

if db was `[{a: 1}, {a: 2}, {a: 3}]`, doing `db.view('a')` will return an object like so:

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

<h3><a name=lazyView> [function] lazyView( string )</a> [ <a href=#toc-finding>top</a> ] </h3>
lazyViews are views that don't update automatically.  Their invocation style is the same as views and they return a function with properties that correspond to the view. That means that you can use it the same way but in order to update it you have to call it as a function. Because of this they should be more performant.

The lambda that gets returned accepts one optional argument which can be either "ins" or "del".

Internally, there are atomic insert and delete counters on a per-database instance that tells features whether they need to update references or not.

If you pass "ins" you are saying "only update the references if something has been inserted since the last call" ... if you do "del" it's the "delete" version of that.

Since things can be updated out of band, there is no way of internally keeping track of that state effeciently.

Example:

    var db = DB({key: 'a', a: 'apple'}, {key: 'b', a: 'banana'});
    var lv = db.lazyView('key');

    lv.a.a ==> 'apple'
    lv.b.a ==> 'banana'

    db.insert({key: 'c', 'a': 'carrot');

    lv('del'); <-- this won't update because the delete counters haven't incremented.

    lv.c.a ==> undefined.

    lv('ins'); <-- now we'll get an update

    lv.c.a ==> 'carrot'

    lv(); <-- this will update things regardless.

<h4>Deep indexing</h4>
Views and lazyViews support deep indexing, which means that if you have an db like this:

    var db = DB([
      { value: [1, 2, 3] },
      { value: [11, 12, 13] },
      { value: [21, 22, 23] }
    ]);

You can do

    var deepIndex = db.view('value[0]');

To get the deep records unraveled to the top.

<h3><a name=indexBy> [void] indexBy( sortConstraint )</a> [ <a href=#toc>top</a> ] </h3>

 * Re-orders the raw index for the DB by the specified sort constraint.  For instance:

   `db.indexBy('key', 'asc')` 

Or, any other style that sorting and orderBy support

<h2><a name=manipulating> Manipulating </a> [ <a href=#toc>top</a> ] </h2>

<h3><a name=each> [array] each( lambda ) </a> [ <a href=#toc-manipulating>top</a> ] </h3>
 *Aliased to map*
*Also a top level function*

The arguments for the lambda for each is either the return of a select as an array or the record
as a return of a find.

This is a convenience on select for when you do select('one','two')
and then you want to format those fields.  The example file included in the git repo has a usage of this.

In some functions, such as `console.log` there has to be a contextualized `thi` pointer established
in order to map the caller indirectly.  In these cases, you have to do a very crufty version of the call like
so:

    db.each([console,console.log]);

Passing the object and the function as an arrayed argument ... I know --- I hate it to.  I wish I could find something
better.

<h3><a name=reduceLeft> [scalar] reduceLeft( memo, lambda | expression )</a> [ <a href=#toc-manipulating>top</a> ] </h3>
This is a macro lambda for each that implements a traditional functional list-reduction. You can use it like so:

    db.each( DB.reduceLeft(0, ' += x.value');

The y parameter is the iterated reduction and the x parameter is the record to reduce.  The second value, the
lambda function can either be a partial expression which will be evaluated to ('y = ' + expression) or it can
be a passed in lambda.

Example:

    DB.reduceLeft(0, '+x.time')(dbLog);

In the above example, the `reduceLeft` returns a function which then takes the parameter `dbLog` as its argument, summing the `.time` over the set.

<h3><a name=reduceRight> [scalar] reduceRight( memo, lambda | expression ) </a> [ <a href=#toc-manipulating>top</a> ] </h3>
This is a right-wise reduction.  It is simply a left-wise with the input list being reversed.

<h3><a name=order> [array] order( multi ) </a> [ <a href=#toc-manipulating>top</a> ] </h3>
 *Aliased to sort*
 *Aliased to orderBy*

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

If the values of the field are an array, then the keys of the array are respected as the
values.

There's another example in the test.html file at around line 414

<h3><a name=keyBy> [map] keyBy( field )</a> [ <a href=#toc-manipulating>top</a> ] </h3>
This is similar to the <a href=#group>group</a> feature except that the values are never
arrays and are instead just a single entry.  If there are multiple values, then the first
one acts as the value.  This should probably be done on unique keys (or columns if you will)

<h2><a name=storage> Storage </a> [ <a href=#toc>top</a> ] </h2>
What if you have an existing database from somewhere and you want to import
your data when you load the page.  You can supply the data to be imported
as an initialization variable.  For instance, say you are using localStorage you could initialize the database as follows:

    var db = DB(
      JSON.parse(localStorage['government-secrets'])
    );

<h3><a name=sync> [handle] sync( callback ) </a> [ <a href=#toc>top</a> ] </h3>
To store the data when it is updated, you define a "sync" function.  Using our
jStorage example from above, we would 'sync' back to by doing the following:

    db.sync(function(data) { 
      $.put("/government-secrets", data); 
    })

The example file includes a synchronization function that logs to screen
when it is run so you can see when this function would be called.  Basically
it is done at the END of a function call, regardless of invocation.  That is
to say, that if you update 10 records, or insert 20, or remove 50, it would be
run, once, once, and once respectively.

If you run sync with no arguments then it will not add an undefined to the function
stack and then crash on an update; on the contrary, it will run the synchronization function stack; just as one would expect.

<h3><a name=transaction> transaction.[ start | end ]() </a> [ <a href=#toc>top</a> ] </h3>

This primitive function turns off all the synchronization callbacks after a start, and then restores them after a end, running them.

This is useful if you have computed views or if you are sync'ing remotely with a data-store. 

This is a binary system. That is to say that transactions can't be nested.  

<h4>Example:</h4>

    // Sync will only run after the end
    db.transaction.start(); {
      for(var i = 0; i < 10;i ++) {
        db.insert({k: i});
      }
    } db.transaction.end(); 

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

<h3><a name=buzzword>Buzzword Compliance</a> [ <a href=#toc>top</a> ] </h3>

#### Visitor Pattern
So there's quite a bit of [that](http://en.wikipedia.org/wiki/Visitor_pattern) here.
For instance, there's a right reduce, which is really just a left reduce with the list inverted.

So to pull this off, 

 1. We call reduceLeft which returns a function, we'll call that the left-reducer.
 2. We wrap the left-reducer in another function, that will be returned, which takes the arguments coming in, and reverses them.

This means that all it really is, (unoptimized) is this:

    function reduceRight(memo, callback) {
      return function(list) {
        return (
          (reduceLeft(memo, callback))
          (list.reverse())
        );
      }
    }

#### Strategy Pattern
No DB would be complete without a [strategy](http://en.wikipedia.org/wiki/Strategy_pattern). An example of this would be isin, which
creates different macro functions depending on the arguments.

Of course, isin returns a function which can then be applied to find. This has another name.

#### Command Pattern
So almost everything can take functions and this includes other functions. So for instance, pretend we had an object whitelist and
we wanted to find elements within it.  Here's a way to do it:

    var whitelistFinder = db.isin({key: "whitelist"});
    setInterval(function(){
      db.find(whitelistFinder);
    }, 100);

Let's go over this.  By putting whitelist in quotes, isin thinks it's an expression that needs to be evaluated.  This means that a
function is created:

    function(test) {
      return indexOf(whitelist, test) > -1;
    }  

indexOf works on array like objects (has a .length and a [], similar to Array.prototype). So it works on those generics.

Ok, moving on. So what we almost get is a generic function. But this goes one step further, it binds things to data ... after all this is
a "database". The invocation style

    db.isin({key: "whitelist"});

Means that it will actually return

    {key: function...}

Which then is a valid thing to stuff into almost everything else.


<h3><a name=syntax>Syntax Notes</a> [ <a href=#toc>top</a> ] </h3>
Great lengths have been taken to have a flexible and expressive API that
conforms to dynamic coding styles.

For instance, if you wanted to update 'key' to be 'value' for all records
in the database, you could do it like

    db.update('key', 'value')

or

    db.update({key: 'value'})

or you can chain this under a find if you want to only update some records

    db
      .find({key: 'value'})
      .update({key: 'somethingelse'})

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

<h3><a name=users>Users</a> [ <a href=#toc>top</a> ] </h3>
If you use this library, let me know on the mailing list or through github!

Current users:

 * [ytmix](https://github.com/kristopolous/ytmix) a data drive youtube application
