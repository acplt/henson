var app, timer, clickedPath;

var initializeTree = function() {
  $('#tree').dynatree({
    keyPathSeparator: '|',
    // lazy read: load nodes when expanded with ajax
    onLazyRead: function(node) {
      app.getNode(node, node.data.key);
    },
    onActivate: function(node) {
      app.setActivePath(node.data.key);
      // is node a link or a domain?
      if (node.data.type == 'link') {
        app.getReferences(node.data.key);
      } else {
        app.getData(node.data.key);
      }
      // set refresh interval timer
      if ($('#auto-refresh').is(':checked')) {
        window.clearInterval(timer);
        timer = window.setInterval(function() {
          app.refreshNode(node);
        }, parseInt($('#refresh-timeout').val())*1000);
      }
    },
    onClick: function(node) {
      if (node.isActive() && node.data.type == 'link') {
        app.getReferences(node.data.key);
      }
    },
    onExpand: function(flag, node) {
      // when closing node set to lazy again
      if (!flag) node.resetLazy();
    },
    debugLevel: 1
  });
  $('#tree').dynatree('getRoot').removeChildren();
}

var initializeSearchTree = function() {
  $('#search-tree').dynatree({
    keyPathSeparator: '|',
    // lazy read: load nodes when expanded with ajax
    onLazyRead: function(node) {
      app.getNode(node, node.data.key);
    }
  });
  var rootNode = $('#search-tree').dynatree('getRoot');
  rootNode.removeChildren();
  app.drawRoot(rootNode, $('#server-name').val());
}

var registerCustomEventListeners = function() {
  $('#view-table').off('setServer').on('setServer', function(e, serverName) {
    app.getPort(serverName);
  });
  $('#view-table').off('setPort').on('setPort', function(e, data) {
    app.serverConnection.setServerPort(data.port);
    app.drawRoot($('#tree').dynatree('getRoot'), data.serverName);
    app.getLogfile();
  });
  $('#view-table').off('getVariable').on('getVariable', function(e, path) {
    app.getVariable(path);
  });
  $('#view-table').off('getReferences').on('getReferences', function(e, path) {
    app.getReferences(path);
  });
  $('#view-table').off('setVariable').on('setVariable', function(e, data) {
    app.setVariable(data.path, data.newValue, data.newVartype);
  });
  $('#view-table').off('createObject').on('createObject', function(e, data) {
    app.createObject(data.path, data.factory);
  });
  $('#view-table').off('deleteObject').on('deleteObject', function(e, path) {
    app.deleteObject(path);
  });
  $('#view-table').off('renameObject').on('renameObject', function(e, data) {
    app.renameObject(data.path, data.newName);
  });
  $('#view-table').off('link').on('link', function(e, data) {
    app.link(data.path, data.element);
  });
  $('#view-table').off('unlink').on('unlink', function(e, data) {
    app.unlink(data.path, data.element);
  });
  $('#view-table').off('loadLibrary').on('loadLibrary', function(e, data) {
    app.createObject(data.path, data.factory);
  });
  $('#view-table').off('refresh').on('refresh', function(e, path) {
    app.refreshNode($('#tree').dynatree('getTree').getNodeByKey(path));
  });
  $('#view-table').off('getInstantiable').on('getInstantiable', function(e, path) {
    app.getInstantiable(path);
  });
}

var registerContextMenuEventListeners = function() {
  $('.dropdown-menu li a[href="#modal-instantiate"]').off('click').click(function() {
    app.getInstantiate(clickedPath);
  });
  $('.dropdown-menu li a[href="#modal-delete"]').off('click').click(function() {
    app.drawDelete(clickedPath);
  });
  $('.dropdown-menu li a[href="#modal-rename"]').off('click').click(function() {
    app.drawRename(clickedPath);
  });
  $('.dropdown-menu li a[href="#modal-link"]').off('click').click(function() {
    app.drawLink(clickedPath);
  });
}

$(document).ready(function() {

  // is URL set in hash? then copy to input
  if (Application.history.getHashArray().length > 0) {
    $('input#server-address').val(Application.history.getServerAddress());
    $('input#path').val(Application.history.getPath());
  }
  
  // listen to clicks on nav buttons
  $('#button-submit').off('click').click(function(event) {

    // don't reload page on submit
    event.preventDefault();
    
    var conn = new ServerConnection($('#server-address').val());
    app = new Application(conn);
    
    initializeTree();
    registerCustomEventListeners();
    registerContextMenuEventListeners();

    app.fillServerList();
    
    // save clicked path to global variable
    $('#view-table').off('saveClickedPath').on('saveClickedPath', function(e, path) {
      clickedPath = path;
    });
    
    // read history change event
    $(window).off('popstate').on('popstate', function(e) {
      app.expandNodes(Application.history.getPath());
    });
    
    // listen to enter on modal
    $('.modal').off('keyup').keyup(function(e) {
      //if (e.keyCode == 13 && fokus auf modal ('.modal.in') && fokus nicht auf textarea) {
      if (e.keyCode == 13 && $('.modal:visible').length > 0 && $('.modal:visible textarea:focus').length == 0) {
        $('.modal:visible button.btn-primary, .modal:visible button.btn-danger').click();
      }
    });
    
    $(window).resize();
  });
  $('#button-refresh').off('click').click(function(event) {
    event.preventDefault();
    app.refreshNode($("#tree").dynatree("getActiveNode"));
  });
  $('#button-instantiate').off('click').click(function(event) {
    event.preventDefault();
    app.getInstantiate($("#tree").dynatree("getActiveNode").data.key);
  });
  $('#button-delete').off('click').click(function(event) {
    event.preventDefault();
    app.drawDelete($("#tree").dynatree("getActiveNode").data.key);
  });
  $('#button-rename').off('click').click(function(event) {
    event.preventDefault();
    app.drawRename($("#tree").dynatree("getActiveNode").data.key);
  });
  $('#button-link').off('click').click(function(event) {
    event.preventDefault();
    app.drawLink($("#tree").dynatree("getActiveNode").data.key);
  });
  $('#button-load-library').off('click').click(function(event) {
    event.preventDefault();
    app.drawLoadLibrary();
  });
  $('#tree-controls button').off('click').click(function(event) {
    event.preventDefault();
    app.changeTreeWidth(parseInt($(this).attr('data-increase')));
  });
  
  // search tree button in link / references modal
  $('.button-new-link-search').off('click').click(function() {
    initializeSearchTree();
  });
  $('#save-use').off('click').click(function() {
    var nodeKey = $('#search-tree').dynatree('getActiveNode').data.key;
    $('.modal:visible .link-search-tree').val(nodeKey);
  });
  
  // refresh button in variable modal
  $('#refresh-variable').off('click').click(function() {
    $('#view-table').trigger('getVariable', $('#modal-variable .modal-title span').html());
  });
  
  // resize on collapse
  $('.collapse').off('hidden').on('hidden', function() {
    $(window).resize();
  });
  $('.collapse').off('shown').on('shown', function() {
    $(window).resize();
  });
  
  // Set refresh timeout
  $('#refresh-timeout, #auto-refresh').off('change').change(function() {
    window.clearInterval(timer);
    if ($('#auto-refresh').is(':checked')) {
      
      timer = window.setInterval(function() {
        app.refreshNode($('#tree').dynatree('getActiveNode'));
      }, parseInt($('#refresh-timeout').val())*1000);
    }
  });
  
  // show spinner on ajax load
  $(document).ajaxStart(function() {
    $('.loading-animation').removeClass('hide');
  }).ajaxStop(function() {
    $('.loading-animation').addClass('hide');
  }).ajaxError(function() {
    $('.loading-animation').addClass('hide');
  });
  
  // Adjust viewport on resize
  $(window).resize(function() {
    $('#values .tab-pane').css('height', function() {
      height = $(window).height()*0.96 - $('.navbar').outerHeight(true) - $('#nav-form').outerHeight(true) - $('#values ul.nav-tabs').outerHeight(true);
      return height;
    });
    
    $('#tree ul.dynatree-container').css('height', function() {
      height = $(window).height()*0.96 - $('.navbar').outerHeight(true) - $('#nav-form').outerHeight(true);
      return height;
    });
    
    $('#tree-controls button').css('height', function() {
      height = $(window).height()*0.96 - $('.navbar').outerHeight(true) - $('#nav-form').outerHeight(true) + 6;
      return height;
    });
  });
  
	// add zen mode to inputs
  $('.zen-mode').zenForm({ trigger: '.zen-open', theme: 'light' });

  // fire it up
  Application.history.initServerAddress();
  $('#button-submit').trigger('click');
});