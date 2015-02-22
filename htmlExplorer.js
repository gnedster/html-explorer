$(document).ready(function() {
    console.log("ready!");

    (function () {
        var key, cachedEl;

        function removeHighlight() {
            if (_.isString(key) === false) {
                return;
            }

            if (_.isObject(cachedEl) === true) {
                cachedEl.removeClass("highlight");
            }
        }

        function addHighlight() {
            if (_.isString(key) === false) {
                return;
            }

            cachedEl = $("#resp code")
                        .find(".hljs-title")
                        .filter(function(idx) {
                            return $(this).text() === key;
                        }).parent();
            cachedEl.addClass("highlight");
        }

        $(".sidebar").find("tbody").mouseover(function(el){
            removeHighlight();
            key = $(el.target).parent("tr").data("key");
            addHighlight();
            console.debug(key);
        }).mouseout(removeHighlight)
    })();

    $("#target").submit(function(e) {
        function errorHandler() {
            $("#flash").show();
            $("#resp code").text("Waiting for input...");
            $(".sidebar").find("tbody").html("");
            console.warn("Retrieving html failed!");
        }

        var url = $(e.target).find("input[type=url]").val();

        //TODO: Fix HTTPS
        //TODO: Fix responsiveness
        $("#spinner").show();
        $("#flash").hide();
        $("#btnSubmit").prop("disabled", true);

        $.ajax({
            url: "/url",
            type: "POST",
            data: {
                url: url
            },
            success: function(resp) {
                var key, tbody = [];

                try {
                    resp = JSON.parse(resp);

                    $("#resp").find("code").text(resp.html);
                    $("#resp code").each(function(i, block) {
                        hljs.highlightBlock(block);
                    });

                    for (key in resp.stats) {
                        if (resp.stats.hasOwnProperty(key) === true) {
                            tbody.push("<tr data-key=" + key + "><td>" +
                                key + "</td><td>" + resp.stats[key] + "</td</tr>");
                        }

                        $(".sidebar").find("tbody").html(tbody.join(""));
                    }

                    console.log("Retrieving html succeeded!");
                } catch (e) {
                    errorHandler();
                }
            },
            error: errorHandler,
            complete: function() {
                $("#spinner").hide();
                $("#btnSubmit").prop("disabled", false);
            }
        })

        e.preventDefault();
    });
});