// builtins

const fs = require('fs')
const path = require('path');

// third party modules
// allowing web administration is half of these :(

const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const ConnectRoles = require('connect-roles')
const serveStatic = require('serve-static')
const app = express()
const md = require("marked")
const typeset = require("typeset")

// yes, this is lazy to be sync.
// it only happens on start and if it fails the server shouldn't spin up anyway.

const config = JSON.parse(fs.readFileSync('config.json'))
var contentStore = JSON.parse(fs.readFileSync(config.dataPath))
var content = expandContentStore(contentStore)

const postTemplate = {
	title : "",
	tag : "",
	featured : false,
	featuredImage : "",
	media : "",
	post : "",
	sidebar : ""
}

// set globals from config

const serverRoot = path.resolve(config.fileRoot)
const headlineText = config.headline
const perPage = config.perPage
const viewsPath = config.viewsPath

// set up user middleware

const user = new ConnectRoles({
	failureHandler: function (req, res, action) {
		res.status(403);
		if(req.route && (req.route.path === '/secret/:pageName' || req.route.path === '/tag/secret')){
			res.render("login", { "pageTitle": "login", "message":"", "headline":"login", 'user': req.user, 'redirectURL' : req.url });
		} else res.render('error', { status:404, "pageTitle": "404", 'user': req.user});
	}
});

user.use(function (req, action) {
	if (!req.isAuthenticated()) return action === 'public';
})

user.use('administrate', function (req) {
	if (req.user.role === "admin") {
		return true;
	}
})

user.use('viewprotected', function (req) {
	if (req.user.role === "admin" || req.user.role === "guest") {
		return true;
	}
})


// serve assets dir
app.use('/', serveStatic(serverRoot));
app.set('basepath', serverRoot)

// general express config
app.set('views', viewsPath)
app.set('view engine', 'jade')

// express middleware for admin
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
	secret: 'lololol',
	saveUninitialized: true,
	resave: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(user.middleware());


// configure passport for auth

passport.use(new LocalStrategy({
		usernameField: 'username',
		passwordField: 'phash'
	},function(username, password, done) {
  		if(username === config.username && password === config.passwordMD5){
  			return done(null,{
  				role:"admin",
  				username:username
  			})
  		} else if(username === config.guestUsername && password === config.guestPasswordMD5){
  			return done(null,{
  				role:"guest",
  				username:username
  			})
  		} else return done(null,false, { message: 'There was a problem with your Username or Password.'})
	}
));

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});


// admin routes 

app.use('/admin/', user.can('administrate'), serveStatic('admin'));

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/login');
});

app.get('/login', function(req,res){
	res.render("login", { "pageTitle": "login", "message":"", "headline":"login", 'user': req.user });
})

app.post('/login',passport.authenticate('local'),function(req,res){
	if(req.isAuthenticated()){
		if(req.body.url) res.redirect(req.body.url)
		else {
			if(req.user.role === 'admin') res.redirect('/edit')
			else if(req.user.role === 'guest') res.redirect('/tag/secret')
			else res.redirect('/')
		}
	} else res.redirect('/login')
});

app.get('/edit', user.can('administrate'), function(req,res){
	res.render("adminList", { "pageTitle": "admin", "message":"list" , 'user': req.user, 'posts':contentStore.posts});
})
app.get('/edit/:index',user.can('administrate'), getEditPage)
app.post('/edit/:index',user.can('administrate'), savePage)
app.get('/delete/:index',user.can('administrate'), deletePage)
app.post('/swap/:firstIndex/:secondIndex',user.can('administrate'), swapPages)

app.get('/reload',user.can('administrate'), reloadContentStore)

// set secret routes

app.get('/tag/secret',user.can('viewprotected'),getTag)
app.get('/secret/:pageName',user.can('viewprotected'),getPage)

// set public routes

app.get('/tag/:tag',getTag)
app.get('/:tag/:pageName',getPage)
app.get('/:pageName',getPage)
app.get('/',getHome)

app.get('*', function(req, res){
	res.render("error", { status:404, "pageTitle": "404", 'user': req.user })
})


// all the text transforms to be applied to body copy
function processBodyCopy(copy){
	return typeset(md(copy))
}

// processes the contentStore json into something easily useable by the routes
// this creates redundancies in the data that'd be tiresome to maintain in the
// contentStore file, and is relatively cheap since we only do it on start
// or if content changes.

function updateContentAndSave(){
	content = expandContentStore(contentStore)
	fs.writeFile(config.dataPath,JSON.stringify(contentStore))
}

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

			post.post = processBodyCopy(post.post)
			post.sidebar = processBodyCopy(post.sidebar)
			var media = []
			var mediaItems = post.media.split('\r\n')
			mediaItems.forEach(function(i){
				var values = i.split(' ')
				var m = { type : values[0]}
				if(values[0] === 'image'){
					m['1x'] = values[1] ? values[1] : ''
					m['2x'] = values[2] ? values[2] : ''
				} else {
					m.id = values[1]
				}
				if(m.type) media.push(m)
			})
			post.media = media
			out.posts[lowerTag][store.posts[i].title.toLowerCase()] = post
		}
		return out
	} else throw('Invalid Content JSON. Check config.json and Content JSON for errors.')
}

// public route handlers

function getPage(req, res, next){
	var page = req.params.pageName.toLowerCase().replace(/_/g," ")
	var tag = req.params.tag ? req.params.tag.toLowerCase() : "general"
	if(content.posts && content.posts[tag] && content.posts[tag][page]){
		res.render("page", { "headline" : content.posts[tag][page].title, "post" : content.posts[tag][page], 'user': req.user})
	} else {
		next()
	}
}

function getHome(req, res, next){
	var featuredPostPaths = content.featured
	if(featuredPostPaths){
		var featuredPosts = []
		for (var i = featuredPostPaths.length - 1; i >= 0; i--) {
			var lowerTag = featuredPostPaths[i].tag.toLowerCase()
			var lowerTitle = featuredPostPaths[i].title.toLowerCase()
			featuredPosts.push(content.posts[lowerTag][lowerTitle])
		}
		res.render("pageList", { "headline" : config.headline, "posts" : featuredPosts,'user': req.user})
	} else {
		next()
	}
}

function getTag(req, res, next){
	if(req.route.path !== '/tag/secret') var tag = req.params.tag.toLowerCase()
	else var tag = "secret"
	var items = content.posts[tag]
	if(items){
		var displayTag = tag[0].toUpperCase() + tag.substr(1)
		res.render("pageList", { "headline" : displayTag,  "posts" : items, 'user': req.user})
	} else {
		next()
	}
}


// admin route handlers

function getEditPage(req,res){
	if(req.params.index !== 'new'){
		var post = contentStore.posts[req.params.index]
	} else {
		var post = postTemplate
	}
	res.render("admin", { "pageTitle": "admin", "message":"list" , 'user': req.user, 'post':post, 'index':req.params.index, 'categories':contentStore.categories});
}

function savePage(req,res){
	var index = req.params.index
	if(isNaN(index)) contentStore.posts.push(req.body)
	else contentStore.posts[index] = req.body
	content = expandContentStore(contentStore)
	fs.writeFile(config.dataPath,JSON.stringify(contentStore, null, 4))
	res.redirect(`/${req.body.tag}/${req.body.title}`)
}

function deletePage(req,res){
	var index = req.params.index
	if(!isNaN(index)){
		contentStore.posts.splice(index,1)
		updateContentAndSave()
	}
	res.redirect('/edit')
}

function swapPages(req,res){
	var firstIndex = req.params.firstIndex
	var secondIndex = req.params.secondIndex
	if(contentStore.posts[firstIndex] && contentStore.posts[secondIndex]){
		var swap = contentStore.posts[firstIndex]
		contentStore.posts[firstIndex] = contentStore.posts[secondIndex]
		contentStore.posts[secondIndex] = swap
		updateContentAndSave()
		// kind of scuz, but this sends but the rendered post list.
		// keeps the list render code in one spot on the server,
		// at least.
		res.render('includes/adminPostList', {
				'user': req.user,
				'posts':contentStore.posts
			},
			function(e,list){
				if(!e) {
					res.json({
						list:list,
						status:200
					})
				} else {
					res.status(400)
					res.json({'status':400})
				}
			}
		)
	} else {
		res.status(400)
		res.json({'status':400})
	}
}

function reloadContentStore(req,res){
	// this allows direct reloading of the content store from disk if it was edited manually.
	contentStore = JSON.parse(fs.readFileSync(config.dataPath))
	content = expandContentStore(contentStore)
	res.redirect('/edit')
}

// spin
app.listen(8080)