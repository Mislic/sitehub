
var appasyncadd = appasyncadd || [];
(function(){
	var app = {}, am = {}, self = {};
	var loader = function(an_app){
		app = an_app;
		am = app.misc;
		app.site = module;
		self = module;
		self.init();
	};
	setTimeout(function(){ appasyncadd.push(loader); }, 0);

	var busy = false, sl = $(), af = $(), ief = $(), nef = $();

	var module = {
		reloadSiteList: function() {
			if (busy) return;
			busy = true;
			am.loader.show();
			$.ajax('/api/site/list').always(function(){
				busy = false;
				am.loader.hide();
			}).fail(function(err){
				am.PrintLn('ошибка при загрузке списка сайтов, попробуйте перезагрузить страницу');
			}).done(function(res){
				sl.empty();
				$.each(res.list, function(i, o){
					sl.append([
						'<tr>',
						' <td>'+o.id+'</td>',
						' <td>'+o.slug+'</td>',
						' <td><a href="/api/site/'+o.id+'/index_html">/api/site/'+o.id+'/index_html</a></td>',
						' <td><a href="http://'+o.slug+'.dev">'+o.slug+'.dev</a></td>',
						' <td>',
						'   <a href="#" class="js_call_index_edit_form" data-id="'+o.id+'">редактировать index.html</a>',
						'   <a href="#" class="js_call_nginx_edit_form" data-id="'+o.id+'">редактировать nginx vhost</a>',
						' </td>',
						'<tr>'
					].join('\n'));
				});
			})
		},
		initAddForm: function() {
			af.submit(function(e){
				e.preventDefault();
				if (busy) return;
				busy = true;
				am.loader.show();
				$.ajax('/api/site/add', {
					method: 'POST',
					processData: false,
					contentType: 'text/plain',
					data: af.find('input[type="text"]').val()
				}).always(function(){
					busy = false;
					am.loader.hide();
				}).fail(function(err){
					am.PrintLn('ошибка при доваблении сайта, попробуйте перезагрузить страницу');
				}).done(function(res){
					if (res.error) {
						am.PrintLn('ошибка при доваблении сайта: '+res.error);
					} else {
						af.find('input[type="text"]').val('');
						self.reloadSiteList();
					}
				});
			});
		},
		initIndexEditForm: function() {
			ief.submit(function(e){
				e.preventDefault();
				if (busy) return;
				busy = true;
				am.loader.show();
				$.ajax('/api/site/'+ief.find('input[type="hidden"]').val()+'/index_html', {
					method: 'PUT',
					processData: false,
					contentType: 'text/html',
					data: ief.find('textarea').val()
				}).always(function(){
					busy = false;
					am.loader.hide();
				}).fail(function(err){
					am.PrintLn('ошибка при сохранении index.html сайта, попробуйте перезагрузить страницу');
				}).done(function(res){
					if (res.error) {
						am.PrintLn('ошибка при сохранении index.html сайта: '+res.error);
					} else {
						ief.find('input[type="hidden"]').val('');
						ief.find('textarea').val('');
						ief.hide();
					}
				});
			});
			sl.on('click', '.js_call_index_edit_form', function(e){
				e.preventDefault();
				if (busy) return;
				busy = true;
				am.loader.show();
				var id = $(this).data('id');
				$.ajax('/api/site/'+id+'/index_html').always(function(){
					busy = false;
					am.loader.hide();
				}).fail(function(err){
					am.PrintLn('ошибка при загрузке index.html сайта, попробуйте перезагрузить страницу');
				}).done(function(res){
					ief.find('input[type="hidden"]').val(id);
					ief.find('textarea').val(res);
					$('.js_edit_form').not(ief).hide();
					ief.show();
				});
			});
		},
		initNginxEditForm: function() {
			nef.submit(function(e){
				e.preventDefault();
				if (busy) return;
				busy = true;
				am.loader.show();
				$.ajax('/api/site/'+nef.find('input[type="hidden"]').val()+'/nginx_vhost', {
					method: 'PUT',
					processData: false,
					contentType: 'text/html',
					data: nef.find('textarea').val()
				}).always(function(){
					busy = false;
					am.loader.hide();
				}).fail(function(err){
					am.PrintLn('ошибка при сохранении nginx vhost сайта, попробуйте перезагрузить страницу');
				}).done(function(res){
					if (res.error) {
						am.PrintLn('ошибка при сохранении nginx vhost сайта: '+res.error);
					} else {
						nef.find('input[type="hidden"]').val('');
						nef.find('textarea').val('');
						nef.hide();
					}
				});
			});
			sl.on('click', '.js_call_nginx_edit_form', function(e){
				e.preventDefault();
				if (busy) return;
				busy = true;
				am.loader.show();
				var id = $(this).data('id');
				$.ajax('/api/site/'+id+'/nginx_vhost').always(function(){
					busy = false;
					am.loader.hide();
				}).fail(function(err){
					am.PrintLn('ошибка при загрузке nginx vhost сайта, попробуйте перезагрузить страницу');
				}).done(function(res){
					nef.find('input[type="hidden"]').val(id);
					nef.find('textarea').val(res);
					$('.js_edit_form').not(nef).hide();
					nef.show();
				});
			});
		},
		init: function(){
			sl = $('.js_site_list');
			af = $('.js_site_add_form');
			ief = $('.js_index_edit_form');
			nef = $('.js_nginx_edit_form');
			self.reloadSiteList();
			self.initAddForm();
			self.initIndexEditForm();
			self.initNginxEditForm();
		}
	};

})();

