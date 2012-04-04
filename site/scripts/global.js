//for histogram
var canvas,
	context;
var pointsList = new Array();
var max = 0;

//for hero image preloader
var img = new Image();
	img.id = "imageTransition";
var loading;

//for both preloader and histogram
var histoImg,
	hero,
	activeThumb;

//jquery elems for ease
var	$body,
	$imgLinks,
	$projects,
	$copy,
	$title,
	$one,
	$hero;




$(document).ready(function(){

	//init jquery things
	$body = $('body');
	$imgLinks = $body.find('.thumbs');
	$projects = $body.find('.project'); 
	$copy = $body.find('.copy');
	$one = $body.find('.one');
	$title = $body.find('.title');
	$hero = $body.find('#hero');
	
	//traditional elements
	loading = document.getElementById('loading');	
	canvas = document.getElementById('histogram');
	histoImg = document.getElementById('histoImg');
	hero = document.getElementById('hero');
	
	//prepare drawing context
	if(isCanvasSupported()){
		context = canvas.getContext('2d');

		//calls for histogram render update
		setTimeout(update,30);
	}
	
	//force the loader to fire (also renders histogram)
	if(histoImg){
		img.src = histoImg.src;
	}
	
	//inits histogram points for animation
	for (var i = 0; i < 255; i++){
		pointsList[i] = new Point();
	}
	
	//image swap, using jquery click for convience
	$imgLinks.click(function(){
		loading.textContent = "loading...";
		$('.active').removeClass('active');
		activeThumb = this.children[0];
		$(activeThumb).addClass('active');
		var source = activeThumb.src.replace("/t","");
		if(histoImg.src != source){
			var link = $(this)[0].href;
			if(link.indexOf("vimeo") < 0){
				if(!$('iframe').length){
					loading.style.display = "block";
				} else {
					$('iframe').remove();
				}
				img.src = source;
				if((img.height-30)>0) loading.style.top = (img.height/2 - 8)+"px";
			} else {
				if($('iframe')) $('iframe').remove();
				$hero.append('<iframe src="http://player.vimeo.com/video/'+link.substring(17)+'" width="680" height="452" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>');
				img.src = "http://clvr.cc/i/blank.png";
			}
		}
		return false;
	});
	
	if($hero){
		$hero.click(function(){
			loading.textContent = "loading...";
			var $next = $('.active').removeClass('active').parent().next().children('img');
			if ($next.length) {
				$next.addClass('active');
				var source = $next[0].src.replace("/t","");
				var link = $next.parent()[0].href;
				if(link.indexOf("vimeo") < 0){
					if(!$('iframe').length){
						loading.style.display = "block";
					} else {
						$('iframe').remove();
					}
					img.src = source;
					if((img.height-30)>0) loading.style.top = (img.height/2 - 8)+"px";
				} else {
					if($('iframe')) $('iframe').remove();
					$hero.append('<iframe src="http://player.vimeo.com/video/'+link.substring(17)+'" width="680" height="452" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>');
					img.src = "http://clvr.cc/i/blank.png";
				}
			} else {
				var first = $('.one img')[0];
				$(first).addClass('active');
				var source = first.src.replace("/t","");
				var link = first.parentNode.href;
				if(link.indexOf("vimeo") < 0){
					if(!$('iframe').length){
						loading.style.display = "block";
					} else {
						$('iframe').remove();
					}
					img.src = source;
					if((img.height-30)>0) loading.style.top = (img.height/2 - 8)+"px";
				} else {
					if($('iframe')) $('iframe').remove();
					$hero.append('<iframe src="http://player.vimeo.com/video/'+link.substring(17)+'" width="680" height="452" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>');
					img.src = "http://clvr.cc/i/blank.png";
				}
			}
		});
		if($imgLinks.length){
			$hero.hover(function(){
				loading.style.display = "block";
				loading.textContent = "click to advance";
			}, function(){
				loading.style.display = "none";
				loading.textContent = "loading...";
			});
		}
	}
	
	if($projects){
		$projects.hover(function(){
			img.src = $(this).find('img')[0].src;
			$(this).children('.textLink').addClass('hover');
		},function(){
			$(this).children('.textLink').removeClass('hover');
		});
	}
	
});

$(window).load(function(){
	var oneHeight = $one.outerHeight()-$title.outerHeight()-40;
	if(oneHeight > $copy.height()){
		$copy.height($one.outerHeight()-$title.outerHeight()-40)
	}
});

img.onload = function(){
	if(context) createHistogram();
	if(hero){
		hero.appendChild(img);
		img.style.display = "none";
		$('#imageTransition').fadeIn(75, function(){
			loading.style.display = "none";
			histoImg.src = img.src;
			if(hero.lastChild == img) hero.removeChild(img);
		});	
	}
}


function createHistogram(){
	var imgData = generateImageData(img.width,img.height, img);
	var histogram = generateHistogram(imgData);
	update();
}

function update(){
	runFlag = false;
	canvas.width = canvas.width;
	context.beginPath();
	for (var i = 0; i < 255; i++){
		pointsList[i].update();
		context.moveTo(.5+(i*3),0);
		context.lineTo(.5+(i*3),pointsList[i].y+2);
	}
	context.closePath();
	context.strokeStyle = '#333';
	context.lineWidth = 1;
	context.stroke();

	//prevents running once animation is wrapped up
	if (runFlag) {
		setTimeout(update,20);
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
		pointsList[i].targetY = Math.round((brightness[i]/max)*125);
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