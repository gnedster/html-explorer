$(document).ready(function() {
    console.log("ready!");

    var highlighter = (function () {
        var selectedTag = null,
            cachedEl = {},
            i = -1,
            tr = null;

        function removeHighlight(tag) {
            if (_.isString(tag) === false) {
                return;
            }

            if (_.isObject(cachedEl[tag]) === true) {
                cachedEl[tag]
                    .removeClass("highlight")

                $(cachedEl[tag][i]).removeClass("selected");
            }
        }

        function addHighlight(tag) {
            if (_.isString(tag) === false) {
                return;
            }

            if (_.isObject(cachedEl[tag]) === false) {
                cachedEl[tag] = $("#resp code")
                            .find(".hljs-tag .hljs-title")
                            .filter(function(idx) {
                                return $(this).text() === tag
                            }).parent();
            }

            cachedEl[tag].addClass("highlight");
        }

        function clearSelectedTag() {
            removeHighlight(selectedTag);
            if (tr) {
                tr.removeClass("highlight")
                    .find(".click-counter")
                    .text("");

                tr = null;
            }
            selectedTag = null;
            i = -1;
        }

        $("#wrapper").click(clearSelectedTag);

        $("#sidebar").find("tbody")
            .mouseover(function(e){
                addHighlight($(e.target).parent("tr").data("tag"));
            })
            .mouseout(function(e){
                if (selectedTag !== $(e.target).parent("tr").data("tag")) {
                    removeHighlight($(e.target).parent("tr").data("tag"));
                }
            })
            .click(function(e){
                if ($(e.target).parent("tr").data("tag") !== selectedTag) {
                    clearSelectedTag();
                    selectedTag = $(e.target).parent("tr").data("tag");
                    addHighlight(selectedTag);
                }

                i = (i + 1) % cachedEl[selectedTag].length;
                if (_.isString(selectedTag) === false) {
                    return;
                }

                console.debug("scrolling to " + selectedTag + ":" + i);

                tr = $(e.target)
                    .parent("tr")
                    .addClass("highlight")

                tr.find(".click-counter")
                    .text(i + 1)

                $.scrollTo(cachedEl[selectedTag][i], 100, {offset: { top:-100 }});
                $(cachedEl[selectedTag][i - 1 < 0 ? cachedEl[selectedTag].length - 1 : i - 1]).removeClass("selected");
                $(cachedEl[selectedTag][i]).addClass("selected");

                e.stopPropagation();
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
                    case "ECONNREFUSED":
                        errorMsg = "URL appears to be invalid. Try another URL.";
                        break;
                    case "ETIMEDOUT":
                        errorMsg = "Connection timed out.";
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
            $("#flash").show(100, "linear");

            $("#resp code").text("Waiting for input...");
            $("#sidebar").find("tbody").html("");
        }

        var url = $(e.target).find("input[type=url]").val();

        $("#spinner").show();
        $("#flash").hide(100, "linear");
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
                            tbody.push("<tr data-tag=" + key + "><td>" +
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