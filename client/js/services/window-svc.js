app.service('WindowSvc', ['$rootScope',
    function($rootScope) {
        var windowSvc = {};
        var viewport = {
            xs: $('.visible-xs', $('#viewport-setup')),
            sm: $('.visible-sm', $('#viewport-setup')),
            md: $('.visible-md', $('#viewport-setup')),
            lg: $('.visible-lg', $('#viewport-setup'))
        };

        viewport.atLeast = function(size) {
            switch (size) {
                case 'xs':
                    // the window is always at least xs
                    return true;
                case 'sm':
                    if (viewport.sm.is(':visible') ||
                        viewport.md.is(':visible') ||
                        viewport.lg.is(':visible')) {
                            return true;
                    }
                    return false;
                case 'md':
                    if (viewport.md.is(':visible') ||
                        viewport.lg.is(':visible')) {
                            return true;
                    }
                    return false;
                case 'lg':
                    if (viewport.lg.is(':visible')) {
                        return true;
                    }
                    return false;
            }
        };

        windowSvc.render = function() {
            console.log($('#chat-width').width());
            console.log($('#chat-width').offset().left);
            $('#send-container').width($(window).width() - $('#chat-width').offset().left + 15);
            $('#chat-container').css('left', $('#chat-width').offset().left - 15);
        };

        window.onresize = function() {
            if (viewport.atLeast('md')) {
                $('#send-container').css('position', 'fixed');
                $('#send-container').width($(window).width() - $('#chat-width').offset().left + 15);

                $('#chat-container').css('position', 'fixed');
                $('#chat-container').css('left', $('#chat-width').offset().left - 15);
            } else {
                $('#chat-container').css('position', 'relative').css('width', '100%').css('left', 0);
                $('#send-container').css('position', 'relative').css('width', '100%');
            }
        };

        return windowSvc;
    }
]);
