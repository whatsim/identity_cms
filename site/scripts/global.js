//
// Hey reader. Pardon my mess.
//
// I wrote most of this JS in college, I've done some touch up as part of
// the 2016 rewrite of IdentityCMS but not much. If I were going to do it
// today I'd avoid the use of jQuery I expect, among other excesses (a 
// point object? what?), but the fact of the matter is that'd be motivated
// more by vanity than practicality, and other parts of the stack needed
// attention more urgently. So, with exemption of the HiDPI image loading,
// the client JS is left in the state it was originally deployed in.
//
// The whole CMS is available at https://github.com/whatsim/identity_cms
// The server code is more emblematic of my current style, if that is of
// interest to you.
//

// For histogram
var canvas,
	context;
var pointsList = new Array();
var max = 0;

// For hero image preloader
var img = new Image();
	img.id = "imageTransition";

img.onload = function(){
	if(context) createHistogram();
	if(hero){
		hero.appendChild(img);
		img.style.display = "none";
		$body.find('#imageTransition').fadeIn(75, function(){
			loading.style.display = "none";
			histoImg.src = img.src;
			setTimeout(cleanupTransition,20);
			loading.textContent = "click to advance";
		});	
	}
}

var loading;

// For both preloader and histogram
var histoImg,
	hero;

// jQuery elems for ease
var	$body,
	$imgLinks,
	$projects,
	$copy,
	$title,
	$one,
	$hero,
	$first;

var mul = window.devicePixelRatio;
var imageMultiple = mul > 1 ? "2x" : "1x"

if(window.location.hostname == "willruby.com"){
	window.location = "http://www.willruby.com" + window.location.pathname;
}

$(document).ready(function(){
	
	// init jquery things
	$body = $('body');
	$imgLinks = $body.find('.thumbs');
	$projects = $body.find('.project'); 
	$copy = $body.find('.copy');
	$one = $body.find('.one');
	$title = $body.find('.title');
	$hero = $body.find('#hero');
	$first = $body.find('.one img').first()
	
	// traditional elements
	loading = document.getElementById('loading');	
	canvas = document.querySelector('canvas');
	histoImg = document.getElementById('histoImg');
	hero = document.getElementById('hero');
	
	canvas.width = mul * canvas.width;
	canvas.height = mul * canvas.height;

	// prepare drawing context
	if(isCanvasSupported()){
		context = canvas.getContext('2d');
		// calls for histogram render update
		window.requestAnimationFrame(update);
	}
	
	// force the loader to fire (also renders histogram)
	if(histoImg){
		if($projects.length){
			img.src = histoImg.src
		} else img.src = histoImg.getAttribute(imageMultiple)
	}
	
	// inits histogram points for animation
	for (var i = 0; i < 255; i++){
		pointsList[i] = new Point();
	}
	
	// image swap, using jquery click for convience
	$imgLinks.click(function(){
		var activeThumb = $(this).find('img');
		var source = activeThumb[0].getAttribute(imageMultiple)
		var id = activeThumb[0].getAttribute('videoID')
		
		loadImage(activeThumb,source,id)

		return false;
	});
	
	if($imgLinks.length > 1){
		$hero.click(heroAdvance);

		function heroAdvance(){
			loading.textContent = "loading...";
			var $next = $body.find('.active').removeClass('active').parent().next().children('img');
			if(!$next[0]){
				$next = $first
			}
			var source = $next[0].getAttribute(imageMultiple)
			var id = $next[0].getAttribute('videoID')
			
			loadImage($next,source,id)
		}
	} else if(loading){
		loading.parentNode.removeChild(loading)
	}

	if($projects){
		$projects.mouseenter(function(){
			img.src = $(this).find('img')[0].src;
		});
	}
	
});

window.addEventListener('load',function(){
	var oneHeight = $one.outerHeight()-$title.outerHeight()-40;
	if(oneHeight > $copy.height()){
		$copy.height($one.outerHeight()-$title.outerHeight()-40)
	}
});

window.addEventListener('resize',update,false)

function loadImage(el,source,id){
	if(!el.hasClass('active')){
		var $iframe = $body.find('iframe')
		if(!id){
			if(!$iframe.length){
				loading.style.display = "block";
			} else {
				$iframe.remove();
			}
			img.src = source;
		} else {
			if($iframe) $iframe.remove();
			$hero.append('<iframe src="http://player.vimeo.com/video/'+id+'" width="100%" height="100%" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>');
			img.src = el[0].src
		}
		loading.textContent = "loading...";
		$body.find('.active').removeClass('active');
		el.addClass('active');
	}
}

function cleanupTransition(){
	if(hero.lastChild == img) hero.removeChild(img);
}

function createHistogram(){
	var imgData = generateImageData(img.width/3,img.height/3, img);
	var histogram = generateHistogram(imgData);
	update();
}

function update(){
	runFlag = false;
	canvas.width = canvas.clientWidth * 2;
	context.beginPath();
	for (var i = 0; i < 255; i++){
		pointsList[i].update();
		var x = canvas.clientWidth/255
		context.moveTo(.5*mul+(i*x)*mul,0);
		context.lineTo(.5*mul+(i*x)*mul,(pointsList[i].y+2)*mul);
	}
	context.closePath();
	context.strokeStyle = '#333';
	context.lineWidth = 1*mul;
	context.stroke();

	// prevents running once animation is wrapped up
	if (runFlag) {
		window.requestAnimationFrame(update);
	}
};

function generateImageData(width, height, img) {
	var buffer = document.createElement('canvas');
	var context = buffer.getContext('2d');
    buffer.width = width;
    buffer.height = height;
	context.drawImage(img, 0, 0, width, height);
	var imageData = context.getImageData(0,0,width, height);
    return imageData;
};

function generateHistogram(imageData) {
	var brightness = [];
	for (var i = 0; i < 255; i++) {
        brightness[i] = 0;
    }
	var total = 0;
	for (var i = 0; i < imageData.width*imageData.height; i++){
		for(var l = 0; l < 3; l++){
			total += imageData.data[i*4+l];
		}
		total = Math.round(total/3);
		if(brightness[total] < 2000) brightness[total] += 1/(1+(brightness[total]/100));
		total = 0;
	}
	max = 0;
	for (var i = 0; i < 255; i++){
		if(max < brightness[i]) max = brightness[i];
	}
	
	for (var i = 0; i < 255; i++){

		pointsList[i].targetY = brightness[i]/max*canvas.clientHeight;
	}	
}

function Point(){
	this.y = 0;
	this.targetY = 0;
	this.update = function(){
		this.y = this.y + (this.targetY-this.y)/15;
		if (this.y > max) this.y = max;
		if (Math.abs(this.y - this.targetY) > 1) runFlag = true;
	}
}

function isCanvasSupported(){
	var elem = document.createElement('canvas');
	return !!(elem.getContext && elem.getContext('2d'));
}