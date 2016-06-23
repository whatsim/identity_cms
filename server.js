var express = require('express')
var app = express()
var md = require("marked")
var fs = require('fs')
var less = require('less')

var config = JSON.parse(fs.readFileSync('config.json'))
var contentStore = JSON.parse(fs.readFileSync(config.dataPath))

var serverRoot = config.fileRoot
var headlineText = config.headline
var perPage = config.perPage
var viewsPath = config.viewsPath

app.set('basepath', serverRoot)
app.set('views', viewsPath)
app.set('view engine', 'pug')
app.set('view options', {
  layout: false
})

// app.use(express.cookieParser())
// app.use(express.session({ secret: Math.random().toString(36).substring(7) }))
// app.use(express.bodyParser())

var time = new Date()

function getPage(req, res){
	var regexp = /\/[\w]+/g
	var matches = req.url.match(regexp)
	if(matches[1]) {
		var page = matches[1].replace("/","").replace(/_/g," ")
		var tag = matches[0].replace("/","")
	} else {
		var page = matches[0].replace("/","").replace(/_/g," ")
		var tag = "other"
	}
	if(contentStore.posts && contentStore.posts[tag] && contentStore.posts[tag][page]){
		res.render("page", { "headline" : "home", "posts" : contentStore.posts[tag][page], 'logged': false /*req.session.logged*/})
	} else {
		res.render("404", { status:404, "pageTitle": headlineText, 'logged': false /*req.session.logged*/})
	}
}

function getHome(req, res){
	var featuredPostPaths = contentStore.featured
	if(featuredPostPaths){
		var featuredPosts = []
		for (var i = featuredPostPaths.length - 1; i >= 0; i--) {
			featuredPosts.push(contentStore.posts[featuredPostPaths[i].tag][featuredPostPaths[i].name])
		}
		console.log(featuredPosts)
		res.render("home", { "headline" : "home", "pageTitle" : headlineText, "posts" : featuredPosts,"pageNum":1,"perPage":perPage,'logged':false /*req.session.logged*/})
	} else {
		res.render("404", { status:404, "pageTitle": headlineText, 'logged': false /*req.session.logged*/ })
	}
}

function getTag(req, res){
	var cat = req.url.substring(5)
	var items = contentStore.posts[cat]
	if(items){
		if(items.length) {
			res.render("pages", { "headline" : "home",  "posts" : items, 'logged': false /*req.session.logged*/})
		} else {
			res.render("404", { status:404,  'logged': false /*req.session.logged*/})
		}
	}	
}

app.get("*.less", function(req, res) {
    var path = serverRoot+req.url
    fs.readFile(path, "utf8", function(err, data) {
	    if (err) throw err
		    less.render(data, function(err, css) {
	            if (err) throw err
	            res.header("Content-type", "text/css")
	            res.send(css)
	    })
    })
})

app.get(/(([a-z]*\/)*[a-z,0-9,_]+\.[a-z]+)/, function(req, res, next){
	res.header('Cache-Control', 'public, max-age=3600000')
	fs.stat(serverRoot+"/"+req.params[0],function(err,stats){
		if(err){
			next()
		} else {
			res.sendfile(serverRoot+"/"+req.params[0])
		}
	})
})

// app.get(/delete\//,function(req, res){
// 		if(req.session.phash == "PASSWORD_MD5_HASH"){
// 			var page = req.url.substring(8).replace('_',' ')
// 			db.open(function(err, db) {
// 				db.collection('posts', function(err, collection) {  
// 					collection.remove({'_id':new mongo.ObjectID(page)},function(){
// 						collection.find(function(err, cursor) {	
// 							cursor.sort( { time : -1 } ).skip(0)
// 							cursor.toArray(function(err, items) {
// 								res.render("adminList", { "pageTitle": "admin", "msg":"list" , 'logged': req.session.logged, 'posts':items})
// 								db.close()
// 							})
// 						}); 
// 					})
// 				})
// 			})
// 		} else {
// 			res.render("login", { "pageTitle": "login", "msg":"", "headline":"login", 'logged': req.session.logged })
// 		}
	
// })

// app.get(/admin/,function(req, res){
// 		if(req.session.phash == "PASSWORD_MD5_HASH"){
// 			if(req.url.substring(6) == "/list"){
// 				db.open(function(err, db) {
// 					db.collection('posts', function(err, collection) {  
// 						collection.find(function(err, cursor) {	
// 							cursor.sort( { time : -1 } ).skip(0)
// 							cursor.toArray(function(err, items) {
// 								res.render("adminList", { "pageTitle": "admin", "msg":"list" , 'logged': req.session.logged, 'posts':items})
// 								db.close()
// 							})
// 						});   
// 					})
// 				});   
					
// 			} else {
// 				res.render("admin", { "pageTitle": "admin", "msg":"" , 'logged': req.session.logged , "posts":[]})
// 			}
// 		} else {
// 			res.render("login", { "pageTitle": "login", "msg":"", "headline":"login", 'logged': req.session.logged })
// 		}
// 	})

// app.get(/login/,function(req,res){
	
// 		if(req.session.phash == "PASSWORD_MD5_HASH"){
// 			req.session.destroy()
// 			res.render("login", { "pageTitle": "login", "msg":"logged out", "headline":"login", 'logged': []})
// 		} else {
// 			res.render("login", { "pageTitle": "login", "msg":"", "headline":"login" , 'logged': req.session.logged})
// 		}
	
// })

// app.get(/edit/,function(req,res){
	
// 		if(req.session.phash == "PASSWORD_MD5_HASH"){
// 			var page = req.url.substring(6).replace(/_/g,' ')
// 			db.open(function(err, db) {
// 				db.collection('posts', function(err, collection) {  
// 					collection.find({'_id':new mongo.ObjectID(page)},function(err, cursor) {	
// 						cursor.toArray(function(err, items) {
// 							res.render("admin", { "pageTitle": "admin", "msg":"list" , 'logged': req.session.logged, 'posts':items})
// 							db.close()
// 						})
// 					});   
// 				})
// 			})
// 		} else {
// 			res.render("login", { "pageTitle": "login", "msg":"", "headline":"login" , 'logged': req.session.logged})
// 		}
	
// })

app.get('*', function(req, res){
	if(req.url.substring(0,5) == "/tag/"){
		getTag(req, res)
	} else if(req.url == "/"){
		getHome(req, res)
	} else {
		getPage(req, res)
	}
})



// app.post(/post/,function(req,res){
// 		if(req.session.phash == "PASSWORD_MD5_HASH"){
// 			time = new Date()
// 			db.open(function(err, db) {
// 				db.collection('posts', function(err, collection) {
// 						var images = req.body.images.split("\n")
// 						var length = 0
// 						while(images[length]!="\r" && images[length]!="" && length != images.length){
// 							length ++
// 						}
// 						images.length = length
// 						var post = md(req.body.post, true)
// 						var sidebar = md(req.body.sidebar, true)
// 						if(req.body.id != ""){
// 							collection.update({'_id':new mongo.ObjectID(req.body.id)},{'displayTitle':req.body.title,'title':req.body.title.toLowerCase(),'post':post,'time':time.getTime(),'images': images, 'tags': req.body.tags.toLowerCase().split(", "),'displayTags': req.body.tags.split(", "), 'sidebar': sidebar,'featured':req.body.featured,'preProcessPost':req.body.post,'preProcessSidebar':req.body.sidebar,'preProcessImages':req.body.images, 'featuredImage':req.body.featuredImage, 'process': req.body.process},{upsert:true}, function(){
// 								res.render("admin", { "pageTitle": "admin", "msg":"success", 'logged': req.session.logged , "posts": []})
// 							})
// 						} else {
// 							collection.insert({'displayTitle':req.body.title,'title':req.body.title.toLowerCase(),'post':post,'time':time.getTime(),'images': images, 'tags': req.body.tags.toLowerCase().split(", "),'displayTags': req.body.tags.split(", "), 'sidebar': sidebar,'featured':req.body.featured,'preProcessPost':req.body.post,'preProcessSidebar':req.body.sidebar,'preProcessImages':req.body.images, 'featuredImage':req.body.featuredImage, 'process': req.body.process }, function(){
// 								res.render("admin", { "pageTitle": "admin", "msg":"success", 'logged': req.session.logged , "posts": []})
// 							})
// 						}
					
// 				})
// 			})
			
// 		} else {
// 			req.session.destroy()
// 			res.render("login", { "pageTitle": "login", "msg":"nuh-uh", 'logged': [] })
// 		}
	
	
// })

// app.post(/login/, function(req, res){
// 		if(req.body.name == "whatsim" && req.body.phash == "MD5_PASSHASH"){
// 			req.session.logged = true
// 			req.session.phash = "PASSWORD_MD5_HASH"
// 			res.render("admin", { "pageTitle": "admin", "msg":"logged", 'logged': req.session.logged, "posts": [] })
// 		} else {
// 			req.session.destroy()
// 			res.render("login", { "pageTitle": "login", "msg":"bad login", 'logged': [] })
// 		}
	
// })

app.listen(8080)
