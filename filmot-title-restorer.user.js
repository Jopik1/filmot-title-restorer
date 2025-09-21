// ==UserScript==
// @name         Filmot Title Restorer
// @namespace    http://tampermonkey.net/
// @version      0.46
// @license GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @description  Restores titles for removed or private videos in YouTube playlists
// @author       Jopik
// @match        https://*.youtube.com/*
// @noframes
// @icon         https://www.google.com/s2/favicons?domain=filmot.com
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      web.archive.org
// @require      https://cdnjs.cloudflare.com/ajax/libs/cash/8.1.5/cash.min.js
// ==/UserScript==

var darkModeBackground="#000099";
var lightModeBackground="#b0f2f4";
var darkModeLinkColor="#f1f1f1";

//console.log("Starting filmot title restorer");
document.addEventListener('yt-navigate-start', handleNavigateStart);
document.addEventListener('yt-navigate-finish', handleNavigateFinish);
document.addEventListener( 'yt-action', handlePageDataLoad );
//console.log("addEventListener completed");

// Fire at least once on load, sometimes handleNavigateFinish on first load yt-navigate-finish already fired before script loads
//handleNavigateFinish();

/* UTILITY */
function escapeHTML(unsafe) {
    return unsafe.replace(
        /[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00FF]/g,
        c => '&#' + ('000' + c.charCodeAt(0)).substr(-4, 4) + ';'
    )
}
function getWaybackVideoAvailabilityCheckURL(videoID) {
    return `https://web.archive.org/cdx/search/cdx?url=wayback-fakeurl.archive.org/yt/${videoID}&fl=timestamp,original&output=json&closest=20050101000000&limit=1`;
}
function waybackTimestampToDateString(timestamp) {
    return `${timestamp.slice(6, 8)}.${timestamp.slice(4, 6)}.${timestamp.slice(0, 4)}`;
}

function handlePageDataLoad(event){
    if (event.detail!=null && event.detail.actionName!=null && event.detail.actionName.indexOf("yt-append-continuation")>=0) {
        if (window.location.href.indexOf("/playlist?")>0)
        {
            extractIDsFullView();
        }
    }
}

function handleNavigateStart() {
    var filmotTitles=$(".filmot_title");
    filmotTitles.text("");
    filmotTitles.removeClass("filmot_title");
    var filmotChannels=$(".filmot_channel");
    filmotChannels.text("");
    filmotChannels.attr("onclick","");
    filmotChannels.removeClass("filmot_channel");
    cleanUP();
}

function handleNavigateFinish() {
    cleanUP();

    if (window.location.href.indexOf("/playlist?")>0)
    {
        setTimeout(extractIDsFullView, 500);
    }
    else if (window.location.href.indexOf("/watch?")>0)
    {
        setTimeout(checkIfPrivatedOrRemoved, 500);
    }
}

function cleanUP() {
    $(".filmot_hide").show();
    $(".filmot_hide").removeClass("filmot_hide");
    $(".filmot_newimg").remove();
    $(".filmot_highlight").css("background-color","");
    $(".filmot_highlight").removeClass("filmot_highlight");
    $("#TitleRestoredDiv").remove();
    $(".filmot_c_link").remove();
    $(".filmot_button").remove();
    window.ArchivedIDS={};
    window.RecoveredIDS={};
    window.DetectedIDS={};
}

function checkIfPrivatedOrRemoved() {
    const playabilityStatus=unsafeWindow.ytInitialPlayerResponse.playabilityStatus;
    const status=playabilityStatus.status;
    if (status=="ERROR" || (status=="LOGIN_REQUIRED" && !playabilityStatus.valueOf().desktopLegacyAgeGateReason)) {
        var id=unsafeWindow.ytInitialData.currentVideoEndpoint.watchEndpoint.videoId;
        if (id.length>=11) {
            // Create Wayback Machine archive check/view button
            let parentItem = $("ytd-background-promo-renderer"); // Dead channel or deleted/private video (non-player error)
            if (!parentItem.length) {
                // Video removed for policy violations (player error)
                parentItem = $("div#player");
            }
            const waybackButton = $(document.createElement('button-view-model'))
                .addClass("filmot_button yt-spec-button-view-model")
                .css("margin-bottom", "10px");
            const anchor = $('<a>')
                .addClass("yt-spec-button-shape-next yt-spec-button-shape-next--filled yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment")
                .attr({
                    "target": "_blank",
                    "aria-haspopup": "false",
                    "force-new-state": "true",
                    "aria-disabled": "false",
                    "aria-label": "Check/view Wayback archive",
                    "videoID": id
                })
                .css("background-color", "thistle")
                .one("click", function() {
                    $(this).css("opacity", 0.5);
                    $(this).find("#state-text").text("Checking...");

                    const videoID = $(this).attr("videoID");
                    console.log(`[Filmot] [DEBUG] Checking Wayback Machine for archives of video "${videoID}"...`);
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: getWaybackVideoAvailabilityCheckURL(videoID),
                        onload: (response) => {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data.length > 1) {
                                    const timestamp = data[1][0];
                                    $(this).attr("href", `https://web.archive.org/web/${timestamp}oe_/${data[1][1]}`)
                                        .css("background-color", "limegreen")
                                        .find("#state-text").text("Available: " + waybackTimestampToDateString(timestamp));
                                } else {
                                    $(this).css("background-color", "lightcoral")
                                        .find("#state-text").text("Not Available");
                                }
                                $(this).css("opacity", 1);
                            } catch (err) {
                                console.error("Error parsing video archive availability data from Wayback Machine!", err)
                            }
                        },
                        onerror: (err) => console.error("Error fetching video archive availability data from Wayback Machine!", err)
                    });
                });
            const iconWrapper = $('<div>')
                .addClass("yt-spec-button-shape-next__icon")
                .attr("aria-hidden", "true");
            const icon = $('<img>')
                .attr("src", "https://www.google.com/s2/favicons?domain=archive.org")
                .css({
                    "margin-left": "3px",
                    "margin-top": "5px"
                });
            const text = $('<div>')
                .addClass("yt-spec-button-shape-next__button-text-content")
                .attr("id", "state-text")
                .text("Check For Archives");
            iconWrapper.append(icon);
            anchor.append(iconWrapper);
            anchor.append(text);
            waybackButton.append(anchor);
            parentItem.find("div#buttons").prepend(waybackButton);

            // Check Filmot for archived metadata
            window.deletedIDs=id;
            window.deletedIDCnt=1;
            window.DetectedIDS[id]=1;
            processClick(2,0);
        }
    }
}

function createRestoreButton() {
    // Time to create the 'Restore Titles' button in the Playlist Description Box (left side pane, beneath playlist thumbnail)
    console.log("[Filmot] [DEBUG] Creating 'Restore Titles' button in playlist description box.");

    /////////////////////////////////////////////// PLEASE READ /////////////////////////////////////////////////////////////////////////////
    // For some reason, YouTube (or a browser plugin) sometimes creates one or more duplicate, commented-out Description Boxes.
    // Therefore, we locate all Playlist Description Box elements where 'restore titles' buttons can be placed, and place them in an array.
    // This is admittedly a scorched-earth method, but I am tired of YouTube constantly changing element IDs and breaking this.
    //
    var metactionbars = Array.from(document.querySelectorAll('.description.style-scope.ytd-playlist-header-renderer, page-header-view-model-wiz__page-header-headline-info, div.page-header-view-model-wiz__page-header-content > div.page-header-view-model-wiz__page-header-headline-info, .play-menu.ytd-playlist-header-renderer')).filter(el => el.offsetParent !== null);

    //        ^^^^^ UPDATE THIS WHEN YOUTUBE BREAKS SIDEBAR ELEMENT IDs ^^^^^
    //
    // Note for updaters in the future: This list of descendant selectors can be cleverly structured to add redundancy.
    //                                  The below logic will search for the first valid location to place a button.
    //                                  You can add multiple selectors. If one fails (YouTube UI update), the next valid one will be used.
    //
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    console.log(metactionbars);

    // Check if the metaactionbars array isn't empty.
    if (metactionbars !== undefined || metactionbars.length != 0) {
        // Loop through every possible button placement location in sidebar
        for (var i = metactionbars.length - 1; i >= 0; i--) {
            // Discard potential placement locations that are invisible (see large comment block above)
            if (!metactionbars[i].checkVisibility()) {
                console.log("[Filmot] [DEBUG] [" + i + "/" + metactionbars.length + "] Skipping commented code region.");
                continue;
            }

            console.log("[Filmot] [DEBUG] [" + i + "/" + metactionbars.length + "] Attempting to attach restore button.");

            // Create the container div
            var containerDiv = document.createElement('div');
            containerDiv.id = 'TitleRestoredDiv';
            containerDiv.style.textAlign = 'center';

            // Create the button
            var button = document.createElement('button');
            button.id = 'TitleRestoredBtn';
            button.textContent = 'Restore Titles';

            // Create the link
            var link = document.createElement('a');
            link.href = 'https://filmot.com';
            link.target = '_blank';
            link.style.color = 'white';
            link.style.fontSize = 'large';
            link.textContent = 'Powered by filmot.com';

            // Assemble the elements
            containerDiv.appendChild(document.createElement('br'));
            containerDiv.appendChild(button);
            containerDiv.appendChild(document.createElement('br'));
            containerDiv.appendChild(link);

            // Insert the container at the beginning of metactionbar
            metactionbars[i].insertBefore(containerDiv, metactionbars[i].firstChild);

            // Break out of loop, as we have now added a restore button in a presumably visible location.
            break;
        }
    }
    else {
        console.log("[Filmot] [DEBUG] ERROR: Could not locate playlist sidebar to place restore button.");
    }

}

function extractIDsFullView() {
    window.deletedIDs="";
    window.deletedIDCnt=0;
    var deletedIDs="";
    var deletedIDsCnt=0;

    var rendererSelector="h3.ytd-playlist-video-renderer";
    var a=$(rendererSelector).filter(function() {
        if ($(this).attr('aria-label'))
        {
            return false;
        }

        var meta=$(this).parents("#meta");
        if (meta.length==0) {
            return false;
        }
        return true;
    }).each(function( index, element ) {
        // element == this
        var ahref= $(this).children("a.yt-simple-endpoint");

        if (ahref.length>0) {
            var href=ahref.attr("href");
            var checked=ahref.attr("filmot_chk");
            var id=String(href.match(/v=[0-9A-Za-z_\-]*/gm));

            id=id.substring(2);

            if (id.length>=11 && !checked) {
                ahref.attr("filmot_chk","1");

                // Add Wayback Machine archive check/view button
                const waybackButton = $(document.createElement('button-view-model'))
                    .addClass("filmot_button yt-spec-button-view-model")
                    .attr("id", "button-wayback")
                    .css({
                         "margin-right": "5px",
                         "margin-top": "2vw"
                     });
                const anchor = $('<a>')
                    .addClass("yt-spec-button-shape-next yt-spec-button-shape-next--filled yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment")
                    .attr({
                        "target": "_blank",
                        "aria-haspopup": "false",
                        "force-new-state": "true",
                        "aria-disabled": "false",
                        "aria-label": "Check/view Wayback archive"
                    })
                    .css("background-color", "thistle");
                const iconWrapper = $('<div>')
                    .addClass("yt-spec-button-shape-next__icon")
                    .attr("aria-hidden", "true");
                const icon = $('<img>')
                    .attr("src", "https://www.google.com/s2/favicons?domain=archive.org")
                    .css({
                        "margin-left": "3px",
                        "margin-top": "5px"
                    });
                const text = $('<div>')
                    .addClass("yt-spec-button-shape-next__button-text-content")
                    .attr("id", "state-text")
                    .text("Check For Archives");
                iconWrapper.append(icon);
                anchor.append(iconWrapper);
                anchor.append(text);
                waybackButton.append(anchor);
                $(this).parents("#container").append(waybackButton);

                const archiveData = window.ArchivedIDS[id];
                if (typeof archiveData === "object") {
                    anchor.attr("href", archiveData.url)
                        .css("background-color", "limegreen")
                        .find("#state-text").text("Available: " + waybackTimestampToDateString(archiveData.timestamp));
                } else if (archiveData === false) {
                    anchor.css("background-color", "lightcoral")
                        .find("#state-text").text("Not Available");
                } else {
                    anchor.attr("videoID", id).one("click", function() {
                        $(this).css("opacity", 0.5);
                        $(this).find("#state-text").text("Checking...");

                        const videoID = $(this).attr("videoID");
                        console.log(`[Filmot] [DEBUG] Checking Wayback Machine for archives of video "${videoID}"...`);
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: getWaybackVideoAvailabilityCheckURL(videoID),
                            onload: (response) => {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    if (data.length > 1) {
                                        const timestamp = data[1][0];
                                        const archiveData = {
                                            timestamp,
                                            url: `https://web.archive.org/web/${timestamp}oe_/${data[1][1]}`
                                        };
                                        window.ArchivedIDS[videoID] = archiveData;

                                        $(this).attr("href", archiveData.url)
                                            .css("background-color", "limegreen")
                                            .find("#state-text").text("Available: " + waybackTimestampToDateString(timestamp));
                                    } else {
                                        window.ArchivedIDS[videoID] = false;

                                        $(this).css("background-color", "lightcoral")
                                            .find("#state-text").text("Not Available");
                                    }
                                    $(this).css("opacity", 1);
                                } catch (err) {
                                    console.error("Error parsing video archive availability data from Wayback Machine!", err)
                                }
                            },
                            onerror: (err) => console.error("Error fetching video archive availability data from Wayback Machine!", err)
                        });
                    });
                }

                // Add to deleted IDs
                window.DetectedIDS[id]=1;
                if (deletedIDs.length>0) {
                    deletedIDs+=",";
                }
                deletedIDs+=id;
                deletedIDsCnt++;
            }
        }
    });

    if (deletedIDs.length>0) {
        window.deletedIDs=deletedIDs;
        window.deletedIDCnt=deletedIDsCnt;

        // If there are titles to be restored...
        if (document.getElementById ("TitleRestoredBtn")==null)
        {
            console.log("[Filmot] [DEBUG] There are " + deletedIDsCnt + " titles to restore.");

            // Add the 'restore titles' button in the playlist info/description pane
            createRestoreButton();

            /*
            document.getElementById ("TitleRestoredBtn").addEventListener ("click", ButtonClickActionFullView, false);
            */
        }

        // Check Filmot for archived metadata
        processClick(1,0);
    }

}

function reportAJAXError(error)
{
    alert("Error fetching API results " + error);
}

function rgb2lum(rgb)
{
    // calculate relative luminance of a color provided by rgb() string
    // black is 0, white is 1
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgb.length==4) {
        var R=parseInt(rgb[1],10)/255.0;
        var G=parseInt(rgb[2],10)/255.0;
        var B=parseInt(rgb[3],10)/255.0;
        return 0.2126*R + 0.7152*G + 0.0722*B;
    }
    return 1;
}

function processJSONResultSingleVideo(fetched_details, format) {
    var darkMode = -1;
    for (let i = 0; i < fetched_details.length; ++i) {
        var meta = fetched_details[i];
        var escapedTitle = meta.title;

        let item;
        // Dead channel or deleted/private video (non-player error)
        let promoRenderer = $("ytd-background-promo-renderer");
        if (promoRenderer.length) {
            item = promoRenderer.find("div.promo-message").first();

            // Leave some more room for metadata below the message
            promoRenderer.css("padding-top", "10px");
        } else {
            // Video removed for policy violations (player error)
            item = $("#subreason.yt-player-error-message-renderer").first();

            // Make player error take up the whole screen, only if there is no playlist panel visible on the page
            const playlistPanel = $("ytd-playlist-panel-renderer");
            if (!playlistPanel.length || playlistPanel.attr("hidden") !== undefined) {
                $("div#player").css("position", "unset");
            }
        }

        if (darkMode == -1) {
            var lum = rgb2lum(item.css("color"));
            darkMode = (lum > 0.51) ? 1 : 0; //if text is bright it means we are in dark mode
        }

        if (!window.RecoveredIDS[meta.id]) {
            window.RecoveredIDS[meta.id] = 1;
            if (meta.channelname == null) {
                meta.channelname = fetched_details[i].channelid;
            }

            // Create "Powered by Filmot" link
            var brEl = document.createElement('br');
            item[0].appendChild(brEl);

            var poweredByFilmot = document.createElement('a');
            poweredByFilmot.style.fontSize = 'large';
            poweredByFilmot.className = 'yt-simple-endpoint style-scope yt-formatted-string';
            poweredByFilmot.href = 'https://filmot.com';
            poweredByFilmot.target = '_blank';
            poweredByFilmot.textContent = 'Title and Channel from filmot.com';
            item[0].appendChild(poweredByFilmot);

            // Create title link
            var titleContainer = document.createElement('h2');
            titleContainer.textContent = 'Title: ';
            var titleLink = document.createElement('a');
            titleLink.className = 'filmot_c_link yt-simple-endpoint style-scope yt-formatted-string';
            titleLink.dir = 'auto';
            titleLink.href = 'https://filmot.com/video/' + meta.id;
            titleLink.textContent = escapedTitle;
            titleLink.style.color = ((darkMode == 0) ? 'black': 'white');
            titleContainer.appendChild(titleLink);
            item[0].appendChild(titleContainer);

            // Create channel link
            var channelContainer = document.createElement('h2');
            channelContainer.textContent = 'Channel: ';
            var channelLink = document.createElement('a');
            channelLink.className = 'filmot_c_link yt-simple-endpoint style-scope yt-formatted-string';
            channelLink.dir = 'auto';
            channelLink.href = 'https://www.youtube.com/channel/' + meta.channelid;
            channelLink.textContent = meta.channelname;
            channelContainer.appendChild(channelLink);
            item[0].appendChild(channelContainer);

            // Create thumbnail image
            var newThumb = document.createElement('img');
            newThumb.id = 'filmot_newimg';
            newThumb.className = 'style-scope yt-img-shadow filmot_newimg';
            newThumb.onclick = function(event) {
                prompt('Full Title', escapedTitle);
                event.stopPropagation();
                return false;
            };
            newThumb.title = escapedTitle;
            newThumb.width = 320;
            newThumb.src = 'https://filmot.com/vi/' + meta.id + '/default.jpg';
            item[0].appendChild(newThumb);
        }
    }
}

function processJSONResultFullView(fetched_details, format) {
    var darkMode = -1;

    for (let i = 0; i < fetched_details.length; ++i) {
        var meta = fetched_details[i];
        window.RecoveredIDS[meta.id] = 1;
        if (meta.channelname == null) {
            meta.channelname = fetched_details[i].channelid;
        }
        var rendererSelector = "#container.ytd-playlist-video-renderer";
        $(rendererSelector).filter(function() {
            return $(this).find("a.ytd-playlist-video-renderer[href*='" + meta.id + "']").length > 0;
        }).each(function(index, element) {
            const escapedTitle = meta.title;

            var item = $(element);
            item.addClass("filmot_highlight");
            var titleItem = item.find("#video-title");
            titleItem.text(meta.title);
            titleItem.attr("title", meta.title);
            titleItem.attr("aria-label", meta.title);
            titleItem.addClass("filmot_title");
            if (darkMode == -1) {
                var lum = rgb2lum(titleItem.css("color"));
                darkMode = (lum > 0.51) ? 1 : 0; //if text is bright it means we are in dark mode
            }
            item.css("background-color", (darkMode == 0) ? lightModeBackground : darkModeBackground);

            var channelItem = titleItem.parent();
            channelItem.find("a.filmot_c_link").remove();

            // Create a new anchor element
            var channelLinkElement = document.createElement('a');
            channelLinkElement.className = 'filmot_c_link yt-simple-endpoint style-scope yt-formatted-string';
            channelLinkElement.dir = 'auto';
            channelLinkElement.href = 'https://www.youtube.com/channel/' + meta.channelid;
            channelLinkElement.textContent = meta.channelname;
            if (darkMode==1) {
                channelLinkElement.style.color = darkModeLinkColor;
            }

            // Append the new element
            channelItem[0].appendChild(channelLinkElement);

            item.find("#byline-container").attr("hidden", false);
            item.find(".filmot_newimg").remove();

            // Create a new image element
            var newThumbElement = document.createElement('img');
            newThumbElement.id = 'filmot_newimg';
            newThumbElement.className = 'style-scope yt-img-shadow filmot_newimg';
            newThumbElement.style.width = '100%';
            newThumbElement.src = 'https://filmot.com/vi/' + meta.id + '/default.jpg';
            newThumbElement.title = escapedTitle;
            newThumbElement.onclick = function(event) {
                prompt('Full Title', escapedTitle);
                event.stopPropagation();
                return false;
            };

            // Append the new image
            item.find("yt-image")[0].appendChild(newThumbElement);

            item.find("img.ytCoreImageHost").addClass("filmot_hide").hide();

            // Add Filmot button
            let filmotButton = item.find("button-view-model#button-view-filmot");
            if (filmotButton.length) {
                // Button exists, update the URL
                filmotButton.find("a").attr("href", "https://filmot.com/video/" + meta.id);
            } else {
                filmotButton = $(document.createElement('button-view-model'))
                    .addClass("filmot_button yt-spec-button-view-model")
                    .attr("id", "button-view-filmot")
                    .css({
                        "margin-right": "5px",
                        "margin-top": "2vw"
                });
                const anchor = $('<a>')
                    .addClass("yt-spec-button-shape-next yt-spec-button-shape-next--filled yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment")
                    .attr({
                        "target": "_blank",
                        "aria-haspopup": "false",
                        "force-new-state": "true",
                        "aria-disabled": "false",
                        "href": "https://filmot.com/video/" + meta.id,
                        "aria-label": "View on Filmot"
                    })
                    .css("padding-right", "0");
                const iconWrapper = $('<div>')
                    .addClass("yt-spec-button-shape-next__icon")
                    .attr("aria-hidden", "true");
                const icon = $('<img>')
                    .attr("src", "https://www.google.com/s2/favicons?domain=filmot.com")
                    .css({
                        "margin-left": "3px",
                        "margin-top": "5px"
                    });
                iconWrapper.append(icon);
                anchor.append(iconWrapper);
                filmotButton.append(anchor);
                item.find("button-view-model").before(filmotButton); // Add as first (leftmost) button
            }
        });
    }
    $("#TitleRestoredBtn").text(Object.keys(window.RecoveredIDS).length + " of " + Object.keys(window.DetectedIDS).length + " restored");
}

function processClick(format, nTry) {
    var maxTries = 2;
    var apiURL = 'https://filmot.com/api/getvideos?key=md5paNgdbaeudounjp39&id=' + window.deletedIDs;

    fetch(apiURL)
        .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
        .then(data => {
        if (format == 1) {
            processJSONResultFullView(data, format);
        } else if (format == 2) {
            processJSONResultSingleVideo(data, format);
        }
    })
        .catch(error => {
        if (nTry >= maxTries) {
            console.error("filmot fetch error:", error);
            console.error("filmot fetch message:", error.message);
            console.error("filmot fetch stack:", error.stack);

            reportAJAXError(apiURL + " " + JSON.stringify(error));
            return;
        }
        processClick(format, nTry + 1);
    })
        .finally(() => {
        // This function will be called regardless of success or failure
    });

}

function ButtonClickActionFullView (zEvent) {
    processClick(2,0);
    return false;
}
