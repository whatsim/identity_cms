
const fs = require('fs')
const path = require('path');

const express = require('express')
const app = express()
const md = require("marked")
const less = require('less')

const config = JSON.parse(fs.readFileSync('config.json'))

var contentStore = JSON.parse(fs.readFileSync(config.dataPath))
var content = expandContentStore(contentStore)

const serverRoot = path.resolve(config.fileRoot)
const headlineText = config.headline
const perPage = config.perPage
const viewsPath = config.viewsPath

app.set('basepath', serverRoot)
app.set('views', viewsPath)
app.set('view engine', 'jade')

// process contentStore into something easily useable by the routes
function expandContentStore(store){
	var out = {
		posts : {},
		featured : []
	}
	if(store.posts && store.posts.length){
		for(var i = 0; i < store.posts.length; i++){
			var lowerTag = store.posts[i].tag.toLowerCase()
			if(store.posts[i].featured){
				out.featured.push({
					tag:lowerTag,
					title:store.posts[i].title
				})
			}
			
			if(!out.posts[lowerTag]) out.posts[lowerTag] = {}
			
			var post = JSON.parse(JSON.stringify(store.posts[i])) //the old json copy

			post.post = md(post.post)
			post.sidebar = md(post.sidebar)

			out.posts[lowerTag][store.posts[i].title.toLowerCase()] = post
		}
		return out
	} else throw('Invalid Content JSON. Check config.json and Content JSON for errors.')
}

function getPage(req, res){
	var regexp = /\/[\w]+/g
	var matches = req.url.match(regexp)
	if(matches[1]) {
		var page = matches[1].replace("/","").replace(/_/g," ").toLowerCase()
		var tag = matches[0].replace("/","").toLowerCase()
	} else {
		var page = matches[0].replace("/","").replace(/_/g," ").toLowerCase()
		var tag = "general"
	}
	if(content.posts && content.posts[tag] && content.posts[tag][page]){
		res.render("page", { "headline" : content.posts[tag][page].title, "post" : content.posts[tag][page], 'logged': false /*req.session.logged*/})
	} else {
		res.render("404", { status:404, "pageTitle": headlineText, 'logged': false /*req.session.logged*/})
	}
}

function getHome(req, res){
	var featuredPostPaths = content.featured
	if(featuredPostPaths){
		var featuredPosts = []
		for (var i = featuredPostPaths.length - 1; i >= 0; i--) {
			var lowerTag = featuredPostPaths[i].tag.toLowerCase()
			featuredPosts.push(content.posts[lowerTag][featuredPostPaths[i].title.toLowerCase()])
		}
		res.render("home", { "headline" : "home", "pageTitle" : headlineText, "posts" : featuredPosts,"pageNum":1,"perPage":perPage,'logged':false /*req.session.logged*/})
	} else {
		res.render("404", { status:404, "pageTitle": headlineText, 'logged': false /*req.session.logged*/ })
	}
}

function getTag(req, res){
	var cat = req.url.substring(5).toLowerCase()
	var items = content.posts[cat]
	if(items){	
		res.render("pages", { "headline" : "home",  "posts" : items, 'logged': false /*req.session.logged*/})
	} else {
		res.render("404", { status:404,  'logged': false /*req.session.logged*/})
	}
}

// render routes

app.get(/(([a-z]*\/)*[a-z,0-9,_]+\.[a-z]+)/, function(req, res, next){
	res.header('Cache-Control', 'public, max-age=3600000')
	fs.stat(serverRoot+"/"+req.params[0],function(err,stats){
		if(err){
			next()
		} else {
			res.sendFile(serverRoot+"/"+req.params[0])
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


// post and login

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
