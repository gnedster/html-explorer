$(document).ready(function() {
    console.log("ready!");

    var highlighter = (function () {
        var selectedTag = null,
            cachedEl = {},
            i = -1; //click counter

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

            $("#sidebar").find("tr[data-tag='" + selectedTag + "']")
                .removeClass("highlight")
                .find(".click-counter")
                .text("");

            selectedTag = null;
            i = -1;
        }

        $("#wrapper").click(clearSelectedTag);

        $("#sidebar").find("tbody")
            .mouseover(function(e){
                addHighlight($(e.target).parent("tr").data("tag"));
            })
            .mouseout(function(e){
                var tag = $(e.target).parent("tr").data("tag");
                if (selectedTag !== tag) {
                    removeHighlight(tag);
                }
            })
            .click(function(e){
                var tr = $(e.target).parent("tr");

                if (tr.data("tag") !== selectedTag) {
                    clearSelectedTag();
                    selectedTag = tr.data("tag");
                }

                if (_.isString(selectedTag) === false) {
                    return;
                }

                i = (i + 1) % cachedEl[selectedTag].length;
                tr.find(".click-counter")
                    .text(i + 1)

                console.debug("scrolling to " + selectedTag + ":" + i);

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
         * @param  {Object}  e              Error details
         * @param  {Boolean} isOperational  Indicates whether or not
         *                                  the error is operational
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