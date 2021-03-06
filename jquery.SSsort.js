/*!
SSsort table-sorter/pager plug-in for JQuery
Version 0.4
Copyright (C) 2014-2015 Tom Phane
Licensed under the GNU Affero GPL v.3 or, at the distributor's discretion, a later version.
See http://www.gnu.org/licenses#AGPL.
*/
/*
 Allows sorting and paging of table rows. Inspired somewhat by TINY.table and
 tablesorter plugins, with emphasis on performance rather than bells-n'-whistles

 Limitations:
   If table has > 1 tbody, only the first one is processed
   Single-column sorting
   No multi-span rows in the table
   All rows must have the same column-span arrangements
   All cells in a column must have the same type of content
   Cells containing multiple elements will sort on the first element only

 Built-in cell-content parsers
	'text'
	'number'
	'isoDate'

 Configuration options:

	sortClass: sortable but unsorted column-header class name, default null
	ascClass: ascending-sorted column-header class name, default null
	descClass: descending-sorted column-header class name, default null
	evenClass: even row class name, default null
	oddClass: odd row class name, default null
	evensortClass: even row sorted-column class, default null
	oddsortClass: odd row sorted-column class, default null
	firstsort: index of column to be sorted at startup, default null
	sortdesc: boolean whether to sort descending (on firstsort), default false
	paginate: boolean whether to paginate the table, default false
	pagesize: no. of displayed rows per page, default 20
	currentid: id of DOM element displaying current page no., default null
	countid: id of DOM element displaying total pages count, default null
	onSorted: function called after a sort is completed, default null

 Other ways to control behaviour:

  Apply class "nosort" to each th node whose column is not sortable

  If the jQuery metadata plugin is available, add a pseudo-class to relevant th
  nodes, like "{sss:'parserid'}" (note the quoted parser id) which will override
  the auto-detection mechanism, or "{sss:false}" to prevent sorting that column.

  Change default parameter(s) using code like
  $.SSsort.defaults.sortClass = 'sortable';

  Add parser(s) using $.SSsort.addParser. Each parser an object, like:
	{	id: 'my-unique-identifier',
		is: function (args) { check whether this parser can be used for this column, return true/false },
		watch: optional boolean, whether to watch for any change of sorted-column
		  value(s), and then if detected, re-read all that column's values before re-sorting
		format: function (args) { return a value for use in comparing rows },
		type: 'text' or 'numeric' specifies how to compare the results from format func
	}
  Each parser's is() and format() must have at least one argument, representing a
  DOM-node-content string. They may have up to two more arguments, representing:
	the DOM-node whose content is the 1st argument,
	the current config-data object

  Here are some example parsers:
	 {	id: 'itext',
		is: function (s) { return true; },
		format: function (s) { return $.toLocaleLowerCase($.trim(s)); },
		type: 'text'
	 }

	 {  id: 'textinput',
		is: function(s,node) {
			var n = node.childNodes[0];
			return (n && n.nodeName.toLowerCase() == 'input' && n.type.toLowerCase() == 'text'));
		},
		watch: true,
		format: function(s,node) {
			return $.trim(node.childNodes[0].value);
		},
		type: 'text'
	 }

	 For this one, remove the space betweeen '*' and '/' in the format function
	 {	id: 'money',
		is: function (s) {
			var p = /^.{0,2}[$€¥£ƒ₹₪₩฿] *\d/;
			return p.test(s);
		},
		format: function (s) {
			return $.SSsort.formatFloat(s.replace(/^.{0,2}[$€¥£ƒ₹₪₩฿] * /,''));
		},
		type: 'numeric'
	 }

	 {	id: 'percent',
		is: function (s) {
			var p = /\.?\d+ *% *$/;
			return p.test(s);
		},
		format: function (s) {
			return $.SSsort.formatFloat(s.replace(/ %/g,'');
		},
		type: 'numeric'
	 }

	 {	id: 'ipAddress',
		is: function (s) {
			var p = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
			return p.test(s);
		},
		format: function (s) {
			var a = s.split('.'),
				l = a.length,
				r = '';
			for (var i = 0; i < l; i++) {
				var item = a[i];
				switch (item.length) {
				 case 1:
					r += '00' + item;
					break;
				 case 2:
					r += '0' + item;
					break;
				 default:
					r += item;
				}
			}
			return $.SSsort.formatInt(r);
		},
		type: 'numeric'
	 }

	 {	id: 'url',
		is: function (s) {
			var p = /^(https?|s?ftp|file):\/\//;
			return p.test(s);
		},
		format: function (s) {
			return $.trim(s.replace(/(https?|s?ftp|file):\/\//),'');
		},
		type: 'text'
	 }

	 {	id: 'usLongDate',
		is: function (s) {
			var p = /^[ADFJMNOS][a-z]{2,9} +[0-3]?\d, +([12]\d{3}|\d{2}) +[0-2]?\d( *: *[0-5]\d){1,2}( *[apAP][mM])?$/;
			return p.test(s);
		},
		format: function (s) { return Date.parse(s); },
		type: 'numeric'
	 }
	 For this one, include
		dateFormat:'us' or whatever
	 among the initialisation options
	 {	id: 'shortDate',
		is: function (s) {
			var p = /\d{1,2} *[\/\-] *\d{1,2} *[\/\-] *(\d{2}|[12]\d{3})/;
			return p.test(s);
		},
		format: function (s, node, cfg) {
			// re-format the string per ISO
			switch (cfg.dateFormat) {
			 case 'us':
				s = s.replace(/(\d{1,2}) *[\/\-] *(\d{1,2}) *[\/\-] *(\d{4})/, "$3/$1/$2");
				break;
			 case 'mm/dd/yy':
				s = s.replace(/(\d{1,2}) *\/ *(\d{1,2}) *\/ *(\d{2})/, "20$3/$1/$2");
				break;
			 case 'uk':
				s = s.replace(/(\d{1,2}) *[\/\-] *(\d{1,2}) *[\/\-] *(\d{4})/, "$3/$2/$1");
				break;
			 case 'dd-mm-yy':
				s = s.replace(/(\d{1,2}) *- *(\d{1,2}) *- *(\d{2})/, "20$3/$2/$1");
				break;
			 default:
				return s;
			}
			return Date.parse(s);
		},
		type: 'numeric'
	 }

	 {	id: 'time',
		is: function (s) {
			var p = /^((0?[1-9]|1[012])( *: *[0-5]\d){0,2} *[apAP][mM]|([01]\d|2[0-3])( *: *[0-5]\d){0,2})$/;
			return p.test(s);
		},
		format: function (s) {
			return Date.parse('2000/01/01 ' + s);
		},
		type: 'numeric'
	 }

	 {	id: 'checked',
		is: function(s,node) {
			var n = node.childNodes[0];
			return (n && n.nodeName.toLowerCase() == 'input' && n.type.toLowerCase() == 'checkbox');
		},
		watch: true,
		format: function(s,node) {
			return (node.childNodes[0].value == 'checked');
		},
		type: 'numeric'
	 }
	 For this one, the jQuery metadata plugin must be available, and you may include
	 	parserMetadataName: whatever
	 among the initialisation options
	 {	id: 'metadata',
		is: function (s) { return false; },
		format: function (s, node, cfg) {
			var p = (cfg.parserMetadataName) ? cfg.parserMetadataName : 'sss';
			var v = $(node).metadata()[p];
			if (!v) { //or if numeric, v : Number.POSITIVE_INFINITY
				v = String.fromCharCode(255);
				v = v + v + v;
			}
			return v;
		},
		type: 'text' //or 'numeric' if relevant
	 }

 Other things to do:

  If pagination is happening, deploy DOM objects with ID currentid and countid
  Deploy DOM objects whose activation hooks into $.SSsort.movePage()

  Listen for and respond to signals 'beforetablesort' and/or 'aftertablesort'
  on the table. Each provides a data object like
	{column: int, direction: boolean }
  where column is a 0-based index, direction is true for descending sort

 Public methods:

  $.SSsort.movePage (table,down,end)
    Show a different page of table rows
	  table = a DOM table element
      down = boolean, down or up direction
      end = boolean, true to go to first last page, false to go to next page
  $.SSsort.setCurrent (table,propname,propvalue)
    Change a current property e.g. pagesize
  $.SSsort.mapTable (table)
    Get a map (object) of the contents of table
  $.SSsort.addParser (parser)
  $.SSsort.formatFloat (string)
    Convert string to float, Number.NEGATIVE_INFINITY if problem happens
  $.SSsort.formatInt (string)
    Convert string to integer, Number.NEGATIVE_INFINITY if problem happens

 Problems:
 sorted-column-content-change watching not yet implemented
 chaining to another parser not yet implemented e.g.
	 {	id: 'input',
		is: function (s, cell, ... [parser]) {
			var n = cell.childNodes[0];
			if(n && n.nodeName.toLowerCase() == 'input' && n.type.toLowerCase() == 'text') {
				return [parser].is(...);
			} else {
				return false;
			}
		},
		format: function (s, cell, ... [parser]) {
			return [parser].format(...);
		},
		type: 'parser'
	 }

 Version history:
   0.2 Initial release April 2014
   0.3 Support runtime property changes May 2015
   0.4 revise processing of {sss:false}, support >1 table per page July 2016
*/

(function($) { "$:nomunge";
 $.extend({
  SSsort: new function () {

	// object/private methods

	function pageCount (cfg) {
		cfg.pagecount = ((cfg.rows.length/cfg.pagesize) | 0) + 1; //Math.ceil() replacement
	}

	function showPage (firstrow, cfg) {
		var ps = parseInt(cfg.pagesize,10);
		if (cfg.currentid) {
			if (ps < 1) {
				cfg.currentpage = 1;
			} else {
				cfg.currentpage = ((firstrow/ps) | 0) + 1;
			}
			$('#'+cfg.currentid).html(cfg.currentpage);
		}
		var rows = cfg.rows;
		if (ps < 1) {
			ps = rows.length + 1;
		}
		var last = firstrow + ps;
		for (var i = 0; i < rows.length; i++) {
			rows[i].style.display = (i >= firstrow && i < last) ? '':'none';
		}
	}

/*	function getChangeWatcher (node, cfg) {
		return false;
		//TODO detect relevant change-event for the column,
		// construct event handler
	}
*/
	function sortMap (cfg) {
		var worker = cfg.works[cfg.sortcol];
		var mapper = worker.parser.format;
		var rows = cfg.rows;
		var l = rows.length;
		var c = cfg.sortcol;
		var _map = [];
		var node;

		for (var i = 0; i < l; i++) {
			node = rows[i].cells[c];
			_map[i] = [mapper(getNodeText(node),node,cfg),i];
		}
		var compare;
		if (worker.parser.type == 'text') {
		 compare = (cfg.sortdesc) ?
			function (a,b) {
				return (b[0].localeCompare(a[0]));
			}:
			function (a,b) {
				return (a[0].localeCompare(b[0]));
			};
		} else { //numeric
		 compare = (cfg.sortdesc) ?
			function (a,b) {
				return (b[0] - a[0]);
			}:
			function (a,b) {
				return (a[0] - b[0]);
			};
		}
		worker._map = _map.sort(compare);
	}

	function doSort (ev) {
		var $tbl = $(this).closest('table');
		var cfg = $.data ($tbl[0], 'SSsortcfg');
		if (cfg.rows.length < 2) {return;}
		var l = this.cellIndex;
		var $cells = cfg.header.find('tr:first > th');
		var col = 0;
		if (l > 0) {
			//adjust for any multi-span columns
			for (var i = 0; i < l; i++) {
				var cell = $cells[i];
				if (cell.hasAttribute('colspan')) {
					var span = cell.getAttribute('colspan');
					col += parseInt(span,10) || 1;
				} else {
					col++;
				}
			}
		}
		var oldcol = null;
		if (col == cfg.sortcol) {
			var oldclass = (cfg.sortdesc) ? cfg.descClass : cfg.ascClass;
			cfg.sortdesc = !cfg.sortdesc;
			var newclass = (cfg.sortdesc) ? cfg.descClass : cfg.ascClass;
			if (oldclass)
				$cells.eq(col).removeClass(oldclass);
			if (newclass)
				$cells.eq(col).addClass(newclass);
			//tell the world we're about to start sorting
			$(cfg.table).trigger('beforetablesort', {column: col, direction: cfg.sortdesc});
			if (cfg.works[col].dirty) {
				sortMap (cfg);
			} else {
				cfg.works[col]._map.reverse ();
			}
		} else { //not the same column
			if (cfg.sortcol !== null) { //not at session start
				oldcol = cfg.sortcol;
				oldclass = (cfg.sortdesc) ? cfg.descClass : cfg.ascClass ;
				if (oldclass)
					$cells.eq(oldcol).removeClass(oldclass);
				if (cfg.sortClass)
					$cells.eq(oldcol).addClass(cfg.sortClass);
				if (cfg.ascClass)
					$cells.eq(col).addClass(cfg.ascClass);
				cfg.sortdesc = false;
			} else {
				if (cfg.sortClass)
					$cells.eq(col).removeClass(cfg.sortClass);
				newclass = (cfg.sortdesc) ? cfg.descClass : cfg.ascClass;
				if (newclass) {
					$cells.eq(col).addClass(newclass);
				}
			}

			cfg.sortcol = col;

			$(cfg.table).trigger('beforetablesort', {column: col, direction: cfg.sortdesc});

			sortMap (cfg);
		}

		//async update, to reduce UI-lockup
		setTimeout(function() {
			//re-create body with rows' data sorted, plain js for speed
			var oddRE = (cfg.oddClass) ? new RegExp('(^|\\s+)'+cfg.oddClass+'(?!\\S)') : false;
			var evenRE = (cfg.evenClass) ? new RegExp('(^|\\s+)'+cfg.evenClass+'(?!\\S)') : false;
			var oddsRE = (cfg.oddClass) ? new RegExp('(^|\\s+)'+cfg.oddsortClass+'(?!\\S)') : false;
			var evensRE = (cfg.evenClass) ? new RegExp('(^|\\s+)'+cfg.evensortClass+'(?!\\S)') : false;
			var body = cfg.body[0];
			var parent = body.parentNode;
			var nextnode = body.nextSibling;
			var rows = cfg.rows;
			var l = rows.length;
/*			var watcher;
			if (typeof(cfg.works[col].parser.watch) !== 'undefined' &&
				cfg.works[col].parser.watch) {
				watcher = getChangeWatcher (rows[0].cells[col], cfg)
			} else {
				watcher = false;
			}
*/
			var _map = cfg.works[col]._map;
			var row, oldcell, j, k;
			parent.removeChild (body); //speedup
			for (var i = 0; i < l; i++) {
				j = _map[i][1];
				row = rows[j];
				cell = row.cells[col];
				body.appendChild (row);
				if (i % 2) { //i is 0-based, so odd represents even to user
					if (oddRE) {
						row.className = row.className.replace(oddRE,'');
					}
					if (evenRE && !row.className.match (evenRE)) {
						row.className = row.className+' '+cfg.evenClass;
					}
					if (oddsRE) {
						cell.className = cell.className.replace(oddsRE,'');
					}
					if (evensRE && !cell.className.match (evensRE)) {
						cell.className = cell.className+' '+cfg.evensortClass;
					}
				} else {
					if (evenRE) {
						row.className = row.className.replace(evenRE,'');
					}
					if (oddRE && !row.className.match (oddRE)) {
						row.className = row.className+' '+cfg.oddClass;
					}
					if (evensRE) {
						cell.className = cell.className.replace(evensRE,'');
					}
					if (oddsRE && !cell.className.match (oddsRE)) {
						cell.className = cell.className+' '+cfg.oddsortClass;
					}
				}
				if (oldcol !== null) {
					oldcell = row.cells[oldcol];
					if (oddsRE) {
						oldcell.className = oldcell.className.replace(oddsRE,'');
					}
					if (evensRE) {
						oldcell.className = oldcell.className.replace(evensRE,'');
					}
				}
//				if (watcher) {
//TODO				apply it to cell(s)
//				}
				_map[i][1] = i;
				for (k = i+1; k < l; k++) {
					if(_map[k][1] > j) {_map[k][1]--;}
				}
			}

			parent.insertBefore (body, nextnode);
			cfg.body = $(cfg.table).children('tbody');
			cfg.rows = body.rows;

//			cfg.works[col].dirty = false;
			cfg.works[col].dirty = (typeof(cfg.works[col].parser.watch) !== 'undefined' &&
				cfg.works[col].parser.watch); //TODO do real per-cell watching

			if (cfg.paginate) {
				cfg.currentpage = 1;
				pageCount (cfg);
				showPage (0, cfg);
				if (cfg.countid) {
					$('#'+cfg.countid).html(cfg.pagecount);
				}
			}
			//tell the world we're done
			$(cfg.table).trigger('aftertablesort', {column: col, direction: cfg.sortdesc});
			$.isFunction(cfg.onSorted) && cfg.onSorted.call(cfg.table);
		}, 20);
	}

	function getNodeText (node) {
		while (node.hasChildNodes()) { node = node.firstChild; }
		var v = node.nodeValue;
		return (v) ? v : false;
	}

	function getParserByContent (colIndex, cfg) {
		var value = false,
			node,
			rows = cfg.rows,
			rowIndex = 0,
			row;
		while (value === false) {
			row = rows[rowIndex];
			if (row) {
				node = row.cells[colIndex];
				value = $.trim(getNodeText(node));
			} else {
				break;
			}
			rowIndex++;
		}

		var parsers = $.SSsort.parsers;
		if (value !== false) {
			var c = $.SSsort.ipcount,
				l = parsers.length;
			// first check external parsers (if any)
			for (var i = c; i < l; i++) {
				if (parsers[i].is (value, node, cfg)) {
					return parsers[i];
				}
			}
			for (i = 1; i < c; i++) { //skip default (0), for now
				if (parsers[i].is (value, node, cfg)) {
					return parsers[i];
				}
			}
		}
		return parsers[0]; //default text-parser
	}

	function getParserById (name) {
		var parsers = $.SSsort.parsers,
			c = $.SSsort.ipcount,
			l = parsers.length,
			lname = name.toLowerCase();
		// first check external parsers (if any)
		for (var i = c; i < l; i++) {
			if (parsers[i].id.toLowerCase() == lname) {
				return parsers[i];
			}
		}
		for (i = 0; i < c; i++) {
			if (parsers[i].id.toLowerCase() == lname) {
				return parsers[i];
			}
		}
		return false;
	}

	function getParser (headernode, cfg) {
		var p = false;
		if ($.metadata) {
			var ms = $(headernode).metadata().sss; //sss is our metadata key
			if (ms === false) {
				return false;
			} else if (ms) {
				p = getParserById (ms);
			}
		}
		if (!p) {
			var col = headernode.cellIndex; //not good for merged cells TODO
			p = getParserByContent (col, cfg);
		}
		return p;
	}

	//class/public data

	this.defaults = {
		sortClass: null, //sortable but unsorted column-header class name
		ascClass: null, //ascending-sorted column-header class name
		descClass: null, //descending-sorted column-header class name
		evenClass: null, //even row class name
		oddClass: null, //odd row class name
		evensortClass: null, //even row sorted-column class
		oddsortClass: null, //odd row sorted-column class
		firstsort: null, //index of column to be sorted at startup
		sortdesc: false, //FALSE for ascending sort (on firstsort)
		paginate: false, //toggle for pagination logic
		pagesize: 20, //no. of displayed rows per page
		currentid: null, //id of DOM element displaying current page no.
		countid: null, //id of DOM element displaying total pages count
		onSorted: null //function to be called after a sort is completed
	};

    this.parsers = [
	 {	id: 'text',
		is: function (s) { return true; },
		format: function (s) { return $.trim(s); },
		type: 'text'
	 },
	 {	id: 'number',
		is: function (s) {
		     return (!isNaN(parseFloat(s)) && isFinite(s));
		},
		format: function (s) {
			if (s) {
				var n = Number(s);
				return (isNaN(n)) ? Number.NEGATIVE_INFINITY:n;
			} else if ((s+'').length > 0) {
				return 0;
			} else {
				return Number.POSITIVE_INFINITY; //sort non-0 empty values last
			}
		},
		type: 'numeric'
	 },
	 {	id: 'isoDate',
		is: function (s) {
			p = /^[12]\d{3}[\/-][01]\d[\/-]\[0-3]\d$/;
			return p.test(s);
		},
		format: function (s) {
			return Date.parse(s.replace(/-/g,'/'));
		},
		type: 'numeric'
	 }
	];

	this.ipcount = this.parsers.length; //count of internal parsers

	//class/public methods

	this.construct = function (options) {
		var common = {
			table: null, //the table element being processed
			header: null, //jQuery object for table's thead
			body: null, //jQuery object for table's tbody
			rows: null, //rows in body[0]
			sortcol: null, //index of currently-sorted column, or null
			sortdata: [], //array of maps, each {o:0-based-rowindex, v:value-to-compare}
			currentpage: 1, //1-based index of displayed page
			pagecount: 1, //no. of pages in the table
			works: []
		};
		this.each (function () {
			var cfg = $.extend ({}, common, $.SSsort.defaults, options || {});
			cfg.table = this;
			var $this = $(this);
			cfg.header = $this.children('thead');
			cfg.body = $this.children('tbody');
			cfg.rows = cfg.body[0].rows; //ignore bodies after 1st!
			cfg.works = [];
			var $cells = cfg.header.find('tr:first > th');
			var vers = $.fn.jquery;
			var meta = $.metadata;
			var col = 0;
			$cells.each(function (){
				var $cell = $(this);
				var skip = $cell.hasClass('nosort');
				if (!skip && meta) {
					if ($cell.metadata().sss === false) { //sss is our metadata key
						skip = true;
					}
				}
				if (!skip) {
					var parser = getParser(this,cfg);
					if (parser) {
						cfg.works[col] = {
							parser: parser,
							dirty: true,
							_map: []
						};
						if (cfg.rows.length > 1 && cfg.sortClass) {
							$cell.addClass(cfg.sortClass);
						}
						//process header-clicks even if 0-1 rows, in case more added later
						if (vers >= '1.7') {
							$cell.on('click',doSort);
						} else {
							$cell.bind('click',doSort);
						}
					}
				}
				col++;
			});

			$.data (this, 'SSsortcfg', cfg); //make config data generally available

			if (cfg.firstsort !== null) {
				$cell = $cells.eq(cfg.firstsort-1);
				skip = $cell.hasClass('nosort');
				if (!skip && meta) {
					if ($cell.metadata().sss === false) { //sss is our metadata key
						skip = true;
					}
				}
				if (skip) {
					cfg.firstsort = null;
				} else {
					$cell.trigger('click'); //the sort will be async
				}
			}
			if (cfg.firstsort === null && cfg.paginate) {
				pageCount (cfg);
				showPage (0, cfg);
				if (cfg.countid) {
					$('#'+cfg.countid).html(cfg.pagecount);
				}
			}
		});
		return this;
	};

	this.movePage = function (table,down,end) {
		var cfg = $.data (table, 'SSsortcfg');
		if (cfg) {
			var newpage = (down) ? ((end) ? cfg.pagecount : cfg.currentpage+1) : ((end) ? 1 : cfg.currentpage-1);
			if (newpage > 0 && newpage <= cfg.pagecount) {
				cfg.currentpage = newpage;
				showPage ((newpage-1) * cfg.pagesize, cfg);
			}
		}
	};

	this.setCurrent = function (table,propname,propvalue) {
		var cfg = $.data (table, 'SSsortcfg');
		if (cfg) {
			cfg[propname] = propvalue;
			showPage (0, cfg);
			if (cfg.countid) {
				pageCount (cfg);
				$('#'+cfg.countid).html(cfg.pagecount);
			}
		}
	};

	this.mapTable = function (table) {
		var result = {};
		var rctr = 1;
		$(table).find('tr').each(function () {
			var rid = this.getAttribute('id') || this.getAttribute('name') || 'row'+rctr;
			var row = {};
			var ctr = 1;
			$(this).each(function () {
				var all = [];
				$(this).children().each(function() {
					all[all.length] = (this.hasAttribute('value')) ?
						this.getAttribute('value'):$(this).text();
				});
				var cid = this.atgetAttribute('id') || this.getAttribute('name') || 'col'+ctr;
				switch (all.length) {
				 case 0:
				  row[cid] = '<empty>';
				  break;
				 case 1:
				  row[cid] = all[0];
				  break;
				 default:
				  var rv = {};
				  for (var i = 0; i < all.length; ++i)
				    rv[i] = all[i];
				  row[cid] = rv;
				  break;
				}
				ctr++;
			});
			result[rid] = row;
			rctr++;
		});
		return result;
	};

	this.addParser = function (parser, force) {
		var newname = parser.id.toLowerCase();
		var parsers = $.SSsort.parsers;
		var l = parsers.length;
		for (var i = 0; i < l; i++) {
			if (parsers[i].id.toLowerCase() == newname) {
				if (force) {
					parsers[i] = parser;
				}
				return;
			}
		}
		parsers[l]  = parser;
	};

	// utilities

	this.formatFloat = function (s) {
		var n = parseFloat (s);
		return (isNaN (n)) ? Number.NEGATIVE_INFINITY : n;
	};

	this.formatInt = function (s) {
		var n = parseInt (s,10);
		return (isNaN (n)) ? Number.NEGATIVE_INFINITY : n;
	};

  }
 });
 $.fn.extend ({ SSsort : $.SSsort.construct });
})(jQuery);
