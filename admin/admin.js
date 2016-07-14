var $posts
var $title
$(document).ready(function(){
	bindEvents()
})

function bindEvents(){
	$posts = $('#posts');
	$title = $('.title h1');
	var $up = $posts.find('.up')
	var $down = $posts.find('.down')
	$up.on('click',function(e){
		var i = $(this).parent().index()
		swap([i,i-1])
	})
	$down.on('click',function(e){
		var i = $(this).parent().index()
		swap([i,i+1])
	})

	function swap(indexes){
		$title.text("Reordering...")
		$.post('/swap/' + indexes[0] + '/' + indexes[1],{},replaceList)
		$up.off('click')
		$down.off('click')
	}
}

function replaceList(data){
	if(data.status == 200){
		$title.text("Posts")
		$posts.replaceWith(data.list)
		bindEvents()
	} else window.location.reload()
}