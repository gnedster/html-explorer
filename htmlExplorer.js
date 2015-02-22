$(document).ready(function() {
    console.log("ready!");

    var highlighter = (function () {
        var key, cachedEl = {}, i = 0;

        function removeHighlight() {
            if (_.isString(key) === false) {
                return;
            }

            if (_.isObject(cachedEl[key]) === true) {
                cachedEl[key].removeClass("highlight");
            }
        }

        function addHighlight() {
            if (_.isString(key) === false) {
                return;
            }

            if (_.isObject(cachedEl[key]) === false) {
                cachedEl[key] = $("#resp code")
                            .find(".hljs-title")
                            .filter(function(idx) {
                                return $(this).text() === key;
                            }).parent();
            }

            i = 0;
            cachedEl[key].addClass("highlight");
        }

        $("#sidebar").find("tbody")
            .mouseover(function(el){
                removeHighlight();
                key = $(el.target).parent("tr").data("key");
                addHighlight();
                console.debug(key);
            })
            .mouseout(function(el) {
                removeHighlight();
                $(el.target)
                    .parent("tr")
                    .find("span.click-counter")
                    .text("");
            })
            .click(function(el){
                if (_.isString(key) === false) {
                    return;
                }

                console.debug("scrolling to " + key + ":" + i);
                $(el.target)
                    .parent("tr")
                    .find("span.click-counter")
                    .text(i + 1);
                $.scrollTo(cachedEl[key][i], 100, {offset: { top:-100 }});
                i = (i + 1) % cachedEl[key].length;
            })

        var o = {
            flushCache : function() {
                cachedEl = {};
            }
        }

        return o;
    })();

    $("#target").submit(function(e) {

        /**
         * Handles both request error and operational errors
         * @param  {[type]} e [description]
         * @return {[type]}   [description]
         */
        function errorHandler(e, isOperational) {
            var errorMsg = "Unknown error occurred. Try another URL.";

            if (isOperational === true) {
                switch (e.errno) {
                    case "ENOTFOUND":
                        errorMsg = "URL appears to be invalid. Try another URL.";
                        break;
                    default:
                        errorMsg = e.errno;
                        break;
                }
            } else {
                if (e.status === 0) {
                    errorMsg = "Connection with server lost." +
                        "Please re-establish your connection";
                } else if (e.status < 200 || e.status > 299) {
                    errorMsg = "Server error occurred.";
                }
            }

            $("#flash").find("span").text(errorMsg);
            $("#flash").show();

            $("#resp code").text("Waiting for input...");
            $("#sidebar").find("tbody").html("");
        }

        var url = $(e.target).find("input[type=url]").val();

        //TODO: Fix HTTPS
        $("#spinner").show();
        $("#flash").hide();
        $("#btnSubmit").prop("disabled", true);
        highlighter.flushCache();

        $.ajax({
            url: "/url",
            type: "POST",
            data: {
                url: url
            },
            success: function(resp) {
                var key, tbody = [];

                resp = JSON.parse(resp);

                if (resp.hasOwnProperty("errno") === true){
                    errorHandler(resp, true);
                } else {
                    $("#resp").find("code").text(resp.html);
                    $("#resp code").each(function(i, block) {
                        hljs.highlightBlock(block);
                    });

                    for (key in resp.stats) {
                        if (resp.stats.hasOwnProperty(key) === true) {
                            tbody.push("<tr data-key=" + key + "><td>" +
                                key + "</td><td>" + resp.stats[key] +
                                " <span class='click-counter'></span></td></tr>");
                        }

                        $("#sidebar").find("tbody").html(tbody.join(""));
                    }
                }
            },
            error: function(e) {
                errorHandler(e, false);
            },
            complete: function() {
                $("#spinner").hide();
                $("#btnSubmit").prop("disabled", false);
            }
        })

        e.preventDefault();
    });
});