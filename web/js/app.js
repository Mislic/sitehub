
var appasyncadd = appasyncadd || [];
(function(){
	var app = {
		misc: {
			pluralize : function(number, odno_slovo, dva_slova, pjat_slov){
				number = parseInt(number, 10);
				if (typeof number !== 'number' || isNaN(number)) number = 0;
				number = Math.abs(number);
				var cases = [2, 0, 1, 1, 1, 2];
				var titles = jQuery.isArray(odno_slovo) ? odno_slovo : [odno_slovo, dva_slova, pjat_slov];
				var rem = number % 100;
				return titles[ (rem > 4 && rem < 20) ? 2 : cases[ Math.min(number % 10, 5) ] ];
			},
			naturalize: function(number) {
				number = parseInt(number, 10);
				if (typeof number !== 'number' || isNaN(number)) number = 0;
				return Math.abs(number);
			},
			PrintLn: function(str) {
				if (typeof str in {'number': 0, 'boolean': 0}) str = str.toString();
				if (typeof str !== 'string') return;
				str = str.replace(/\n/g, '<br />');
				var id = 'kcpldi'+Math.floor(Math.random() * 1000000000)+'a'+(new Date().getTime())+'z';
				$('body').append([
					'<div id="'+id+'" class="kcpldc" style="position: fixed; z-index: 1005001; left: 0px; top: 0px;',
					' background: white; opacity: 0.9; font-family: \'Courier New\', Courier, monospace;',
					' font-size: 16px; font-weight: bold;">'+str+'</div>'
				].join('\n'));
				var line = $('body > #'+id);
				var align = function() {
					var top = 30;
					$('body > .kcpldc').each(function(){
						var o = $(this);
						o.offset({left: 30, top: top});
						top += o.height();
					});
				};
				align();
				var rm = function(){
					line.remove();
					align();
					var cb = $('body > .kcpldc').eq(0).data('selfRemoveCb');
					if (typeof cb === 'function') cb();
				};
				var hide = function() {
					setTimeout(function(){
						line.fadeOut(200, rm);
					}, Math.max(2000, Math.min(str.length * 100, 10000)));
				};
				line.click(rm);
				line.data('selfRemoveCb', hide);
				if ($('body > .kcpldc').length === 1) hide();
			},
			loader: {
				count: 0,
				inited: false,
				cssClass: 'js_loader_2309tuj392',
				selector: '.js_loader_2309tuj392',
				init: function() {
					if (am.loader.inited) return;
					if ($(am.loader.selector).length) return;
					$('body').append([
						'<div class="'+am.loader.cssClass+'" style="display: none; position: fixed;',
						' left: 50%; top: 50%; margin-left: -16px;',
						' margin-top: -16px; opacity: 0.7; cursor: pointer; z-index: 100500;">',
						' <div style="background: url(\'/img/ajax_loader_1.gif\')',
						'  center center no-repeat; width: 32px; height: 32px;">',
						' </div>',
						'</div>'
					].join('\n'));
				},
				show: function() {
					am.loader.init();
					am.loader.count++;
					$(am.loader.selector).show();
				},
				hide: function() {
					am.loader.init();
					am.loader.count = Math.max(0, am.loader.count - 1);
					if (!am.loader.count) {
						$(am.loader.selector).hide();
					}
				},
				hideForce: function() {
					am.loader.init();
					am.loader.count = 0;
					$(am.loader.selector).hide();
				}
			}
		},
		get: function(moduleName) {
			var md = app.moduleLoadDefs[moduleName];
			if (typeof md === 'object' && typeof md.d === 'object' && typeof md.p === 'object') return md.p;
			var def = $.Deferred();
			var pr = def.promise();
			md = {d: def, p: pr};
			app.moduleLoadDefs[moduleName] = md;
			if (typeof app[moduleName] === 'object') def.resolve(app[moduleName]);
			return pr;
		},
		moduleLoadDefs: {},
		onModuleLoaded: function() {
			for (var mi in app.moduleLoadDefs) {
				var md = app.moduleLoadDefs[mi];
				if (typeof app[mi] === 'object' && typeof md === 'object' && typeof md.d === 'object') {
					md.d.resolve(app[mi]);
				}
			}
		},
		init: function() {
			if (!$.isArray(appasyncadd)) return;
			for (var i = 0; i < appasyncadd.length; i++) {
				if (typeof appasyncadd[i] === 'function') {
					appasyncadd[i](app);

					app.onModuleLoaded();
				}
			}
			appasyncadd = {
				push: function(loader){
					if (typeof loader === 'function') {
						loader(app);

						app.onModuleLoaded();
					}
				}
			};
		}
	};
	var am = {};
	var loader = function(){
		$.app = app;
		am = app.misc;
		$(function(){
			app.init();
		});
	};
	var ali = setInterval(function(){
		if (typeof $ !== 'function') return;
		clearInterval(ali);
		setTimeout(loader, 0);
	}, 50);
})();
