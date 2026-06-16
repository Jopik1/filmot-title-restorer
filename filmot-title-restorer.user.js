// ==UserScript==
// @name         Filmot Title Restorer
// @namespace    http://tampermonkey.net/
// @version      0.48
// @license GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @description  Restores titles for removed or private videos in YouTube playlists
// @author       Jopik
// @match        https://*.youtube.com/*
// @noframes
// @icon         https://www.google.com/s2/favicons?domain=filmot.com
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
    //console.log("handlePageDataLoad");
    //console.log(event);
    if (event.detail!=null && event.detail.actionName!=null && event.detail.actionName.indexOf("yt-window-scrolled")>=0) {
        if (window.location.href.indexOf("/playlist?")>0)
        {
            extractIDsFullView();
        }
    }
}

function handleNavigateStart() {
    //console.log("handleNavigateStart");
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
    //console.log("handleNavigateFinish");
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
    const playabilityStatus = unsafeWindow.ytInitialPlayerResponse?.playabilityStatus;
    if (!playabilityStatus) return;

    const status = playabilityStatus.status;
    //console.log("[Filmot] Playability Status:", playabilityStatus);

    if (status === "ERROR" || (status === "LOGIN_REQUIRED" && !playabilityStatus.desktopLegacyAgeGateReason)) {
        const id = unsafeWindow.ytInitialData?.currentVideoEndpoint?.watchEndpoint?.videoId;

        if (id && id.length >= 11) {
            // 1. Create a centered, floating container directly on the body
            let infoContainer = $("#filmot-centered-container");

            if (!infoContainer.length) {
                infoContainer = $(document.createElement('div'))
                    .attr("id", "filmot-centered-container")
                    .addClass("filmot-deleted-video-container")
                    .css({
                        "position": "fixed",
                        "top": "50%",
                        "left": "50%",
                        "transform": "translate(-50%, -50%)",
                        "z-index": "999999", // Sits above all YouTube UI
                        "padding": "30px 40px",
                        "background-color": "var(--yt-spec-raised-background, rgba(33, 33, 33, 0.98))",
                        "border": "1px solid var(--yt-spec-10-percent-layer, rgba(255,255,255,0.2))",
                        "border-radius": "12px",
                        "box-shadow": "0 10px 40px rgba(0,0,0,0.8)",
                        "text-align": "center",
                        "display": "flex",
                        "flex-direction": "column",
                        "align-items": "center",
                        "width": "max-content",
                        "max-width": "90vw"
                    });

                // Add Close Button
                const closeButton = $(document.createElement('button'))
                    .text("✖")
                    .css({
                        "position": "absolute",
                        "top": "10px",
                        "right": "15px",
                        "background": "transparent",
                        "border": "none",
                        "color": "var(--yt-spec-text-secondary, #aaaaaa)",
                        "font-size": "18px",
                        "cursor": "pointer"
                    });

                closeButton.on("click", function() {
                    infoContainer.remove();
                });

                infoContainer.append(closeButton);
                $('body').append(infoContainer);
            }

            // 2. Add Name / ID Header securely
            const titleElement = $(document.createElement('a'))
                .attr({
                    "href": `https://youtu.be/${id}`,
                    "target": "_blank"
                })
                .css({
                    "color": "#3ea6ff",
                    "text-decoration": "none",
                    "display": "block",
                    "margin-bottom": "15px",
                    "font-size": "1.6rem",
                    "font-weight": "500"
                })
                .text(`Unavailable Video ID: ${id}`);

            // 3. Create Wayback Machine button securely
            const waybackButton = $(document.createElement('button-view-model'))
                .addClass("filmot_button yt-spec-button-view-model");

            const anchor = $(document.createElement('a'))
                .addClass("yt-spec-button-shape-next yt-spec-button-shape-next--filled yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading")
                .attr({
                    "target": "_blank",
                    "aria-haspopup": "false",
                    "force-new-state": "true",
                    "aria-disabled": "false",
                    "aria-label": "Check/view Wayback archive",
                    "videoID": id
                })
                .css({
                    "background-color": "thistle",
                    "cursor": "pointer",
                    "text-decoration": "none",
                    "display": "inline-flex"
                });

            const iconWrapper = $(document.createElement('div'))
                .addClass("yt-spec-button-shape-next__icon")
                .attr("aria-hidden", "true");

            const icon = $(document.createElement('img'))
                .attr("src", "https://www.google.com/s2/favicons?domain=archive.org")
                .css({
                    "margin-left": "3px",
                    "margin-top": "5px",
                    "width": "16px",
                    "height": "16px"
                });

            const textNode = $(document.createElement('div'))
                .addClass("yt-spec-button-shape-next__button-text-content")
                .attr("id", "state-text")
                .text("Check For Archives");

            // Safely assemble and append
            iconWrapper.append(icon);
            anchor.append(iconWrapper, textNode);
            waybackButton.append(anchor);
            infoContainer.append(titleElement, waybackButton);

            // 4. Attach Wayback checking logic
            anchor.one("click", function(event) {
                const $this = $(this);
                $this.css("opacity", 0.5);
                $this.find("#state-text").text("Checking...");

                const videoID = $this.attr("videoID");
                const url = typeof getWaybackVideoAvailabilityCheckURL === "function"
                    ? getWaybackVideoAvailabilityCheckURL(videoID)
                    : `https://archive.org/wayback/available?url=youtube.com/watch?v=${videoID}`;

                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    onload: (response) => {
                        try {
                            const data = JSON.parse(response.responseText);
                            let isAvailable = false;
                            let archiveUrl = "";
                            let timestamp = "";

                            if (Array.isArray(data) && data.length > 1) {
                                timestamp = data[1][0];
                                archiveUrl = `https://web.archive.org/web/${timestamp}oe_/${data[1][1]}`;
                                isAvailable = true;
                            } else if (data.archived_snapshots && data.archived_snapshots.closest) {
                                timestamp = data.archived_snapshots.closest.timestamp;
                                archiveUrl = data.archived_snapshots.closest.url;
                                isAvailable = true;
                            }

                            if (isAvailable) {
                                $this.attr("href", archiveUrl)
                                     .css("background-color", "limegreen");
                                const dateStr = typeof waybackTimestampToDateString === "function"
                                    ? waybackTimestampToDateString(timestamp)
                                    : timestamp;
                                $this.find("#state-text").text("Available: " + dateStr);
                            } else {
                                $this.css("background-color", "lightcoral")
                                     .find("#state-text").text("Not Available");
                            }
                            $this.css("opacity", 1);
                        } catch (err) {
                            $this.css("background-color", "lightcoral")
                                 .find("#state-text").text("Parsing Error");
                            $this.css("opacity", 1);
                        }
                    },
                    onerror: (err) => {
                        $this.css("background-color", "lightcoral")
                             .find("#state-text").text("Network Error");
                        $this.css("opacity", 1);
                    }
                });
            });

            // 5. Trigger Filmot API Check
            window.deletedIDs = id;
            window.deletedIDCnt = 1;

            if (!window.DetectedIDS) window.DetectedIDS = {};
            window.DetectedIDS[id] = 1;

            if (typeof processClick === "function") {
                processClick(2, 0);
            }
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
    var metactionbars = Array.from(document.querySelectorAll('yt-content-metadata-view-model.ytPageHeaderViewModelContentMetadataOverlay, .description.style-scope.ytd-playlist-header-renderer, page-header-view-model-wiz__page-header-headline-info, .yt-page-header-view-model__page-header-content-metadata--page-header-content-metadata-overlay, div.page-header-view-model-wiz__page-header-content > div.page-header-view-model-wiz__page-header-headline-info, .play-menu.ytd-playlist-header-renderer')).filter(el => el.offsetParent !== null);



    //        ^^^^^ UPDATE THIS WHEN YOUTUBE BREAKS SIDEBAR ELEMENT IDs ^^^^^
    //
    // Note for updaters in the future: This list of descendant selectors can be cleverly structured to add redundancy.
    //                                  The below logic will search for the first valid location to place a button.
    //                                  You can add multiple selectors. If one fails (YouTube UI update), the next valid one will be used.
    //
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //console.log(metactionbars);

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
    //console.log("Starting extractIDsFullView");
    window.deletedIDs = "";
    window.deletedIDCnt = 0;
    var deletedIDs = "";
    var deletedIDsCnt = 0;

    var rendererSelector = "h3.ytLockupMetadataViewModelHeadingReset";
    $(rendererSelector).filter(function() {
        if ($(this).attr('aria-label')) {
            return false;
        }
        return true;
    }).each(function(index, element) {
        // element == this == h3.ytLockupMetadataViewModelHeadingReset

        var titleContainer = $(this);
        var ahref = titleContainer
            .closest("yt-lockup-view-model")
            .find('a[href*="/watch?v="]')
            .first();

        if (ahref.length > 0) {
            var checked = ahref.attr("filmot_chk");
            if (!checked) {
                var href = ahref.attr("href");
                var id = String(href.match(/v=[0-9A-Za-z_\-]*/gm));

                id = id.substring(2);

                if (id.length >= 11) {
                    ahref.attr("filmot_chk", "1");

                    // Construct Wayback button compactly via jQuery
                    const $iaAnchor = $('<a>')
                        .attr({
                            "id": "button-wayback",
                            "target": "_blank",
                            "title": "Check/view Wayback archive",
                            "aria-haspopup": "false",
                            "force-new-state": "true"
                        })
                        .addClass("ia_button")
                        .css({
                            "float": "right",
                            "margin-left": "10px",
                            "background-color": "thistle",
                            "color": "#000000",
                            "padding": "2px 8px",
                            "border-radius": "4px",
                            "display": "inline-flex",
                            "align-items": "center",
                            "font-family": "Roboto, Arial, sans-serif",
                            "font-size": "12px",
                            "font-weight": "bold",
                            "text-decoration": "none",
                            "cursor": "pointer"
                        });

                    const $icon = $('<img>')
                        .attr("src", "https://www.google.com/s2/favicons?domain=archive.org")
                        .css({
                            "margin-right": "4px",
                            "width": "12px",
                            "height": "12px"
                        });

                    const $textSpan = $('<span>')
                        .attr("id", "state-text")
                        .text("Check Archive")
                        .css("line-height", "1");

                    // Assemble and inject
                    $iaAnchor.append($icon, $textSpan);
                    titleContainer.css("display", "block").prepend($iaAnchor);

                    const archiveData = window.ArchivedIDS[id];
                    if (typeof archiveData === "object") {
                        $iaAnchor.attr("href", archiveData.url)
                                 .css("background-color", "limegreen");
                        $textSpan.text("Available: " + waybackTimestampToDateString(archiveData.timestamp));
                    } else if (archiveData === false) {
                        $iaAnchor.css("background-color", "lightcoral");
                        $textSpan.text("Not Available");
                    } else {
                        $iaAnchor.attr({
                            "href": "javascript:void(0);",
                            "videoID": id
                        });

                        $iaAnchor.one("click", function(e) {
                            e.preventDefault();
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
                                                .css({
                                                    "background-color": "limegreen",
                                                    "opacity": 1
                                                })
                                                .find("#state-text").text("Available: " + waybackTimestampToDateString(timestamp));
                                        } else {
                                            window.ArchivedIDS[videoID] = false;

                                            $(this).attr("href", "javascript:void(0);")
                                                .css({
                                                    "background-color": "lightcoral",
                                                    "opacity": 1
                                                })
                                                .find("#state-text").text("Not Available");
                                        }
                                    } catch (err) {
                                        console.error("Error parsing video archive availability data from Wayback Machine!", err);
                                        $(this).css("opacity", 1).find("#state-text").text("Error");
                                    }
                                },
                                onerror: (err) => {
                                    console.error("Error fetching video archive availability data from Wayback Machine!", err);
                                    $(this).css("opacity", 1).find("#state-text").text("Error");
                                }
                            });
                        });
                    }

                    // Add to deleted IDs
                    window.DetectedIDS[id] = 1;
                    if (deletedIDs.length > 0) {
                        deletedIDs += ",";
                    }
                    deletedIDs += id;
                    deletedIDsCnt++;
                }
            }
        }
    });

    if (deletedIDs.length > 0) {
        window.deletedIDs = deletedIDs;
        window.deletedIDCnt = deletedIDsCnt;

        // If there are titles to be restored...
        if (document.getElementById("TitleRestoredBtn") == null) {
            console.log("[Filmot] [DEBUG] There are " + deletedIDsCnt + " titles to restore.");
            createRestoreButton();
        }

        // Check Filmot for archived metadata
        processClick(1, 0);
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
    // 1. Target the centered container created by checkIfPrivatedOrRemoved
    const container = $("#filmot-centered-container");
    if (!container.length) return;

    if (!window.RecoveredIDS) window.RecoveredIDS = {};

    for (let i = 0; i < fetched_details.length; ++i) {
        const meta = fetched_details[i];
        const escapedTitle = meta.title;

        if (!window.RecoveredIDS[meta.id]) {
            window.RecoveredIDS[meta.id] = 1;
            if (meta.channelname == null) {
                meta.channelname = meta.channelid;
            }

            // 2. Add visual divider
            const divider = $(document.createElement('hr'))
                .css({
                    "border": "0",
                    "border-top": "1px solid var(--yt-spec-10-percent-layer, rgba(255, 255, 255, 0.2))",
                    "margin": "20px 0",
                    "width": "100%"
                });

            // 3. Create "Metadata recovered by Filmot.com" note
            const filmotNote = $(document.createElement('div'))
                .css({
                    "margin-bottom": "10px",
                    "font-size": "1.2rem",
                    "color": "var(--yt-spec-text-secondary, #aaaaaa)"
                })
                .text("Metadata recovered by ");

            const filmotLink = $(document.createElement('a'))
                .attr({
                    "href": "https://filmot.com",
                    "target": "_blank"
                })
                .css({
                    "color": "#3ea6ff",
                    "text-decoration": "none"
                })
                .text("filmot.com");

            filmotNote.append(filmotLink);

            // 4. Create Title element
            const titleContainer = $(document.createElement('h3'))
                .css({
                    "color": "var(--yt-spec-text-primary, #fff)",
                    "font-size": "1.4rem",
                    "margin": "5px 0",
                    "font-weight": "normal"
                })
                .text("Title: ");

            const titleLink = $(document.createElement('a'))
                .attr({
                    "href": 'https://filmot.com/video/' + meta.id,
                    "target": "_blank",
                    "dir": "auto"
                })
                .addClass("filmot_c_link yt-simple-endpoint style-scope yt-formatted-string")
                .css({
                    "color": "#3ea6ff",
                    "text-decoration": "none",
                    "font-weight": "500"
                })
                .text(escapedTitle);

            titleContainer.append(titleLink);

            // 5. Create Channel element
            const channelContainer = $(document.createElement('h3'))
                .css({
                    "color": "var(--yt-spec-text-primary, #fff)",
                    "font-size": "1.4rem",
                    "margin": "5px 0 15px 0",
                    "font-weight": "normal"
                })
                .text("Channel: ");

            const channelLink = $(document.createElement('a'))
                .attr({
                    "href": 'https://www.youtube.com/channel/' + meta.channelid,
                    "target": "_blank",
                    "dir": "auto"
                })
                .addClass("filmot_c_link yt-simple-endpoint style-scope yt-formatted-string")
                .css({
                    "color": "#3ea6ff",
                    "text-decoration": "none",
                    "font-weight": "500"
                })
                .text(meta.channelname);

            channelContainer.append(channelLink);

            // 6. Create Thumbnail image
            const newThumb = $(document.createElement('img'))
                .attr({
                    "id": "filmot_newimg",
                    "title": escapedTitle,
                    "src": 'https://filmot.com/vi/' + meta.id + '/default.jpg'
                })
                .addClass("style-scope yt-img-shadow filmot_newimg")
                .css({
                    "width": "320px",
                    "max-width": "100%",
                    "border-radius": "8px",
                    "cursor": "pointer",
                    "box-shadow": "0 2px 8px rgba(0,0,0,0.5)"
                });

            newThumb.on("click", function(event) {
                prompt('Full Title', escapedTitle);
                event.stopPropagation();
                return false;
            });

            // 7. Inject safely into the centered container
            container.append(divider, filmotNote, titleContainer, channelContainer, newThumb);
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

        // Target the exact wrapper for this specific video ID only
        var itemSelector = "yt-lockup-view-model:has(a.ytLockupViewModelContentImage[href*='" + meta.id + "'])";

        $(itemSelector).each(function(index, element) {
            const escapedTitle = meta.title;
            var item = $(element);

            // Highlight just this specific item
            item.addClass("filmot_highlight");

            // 1. Handle New Title Structure via createElement
            var titleItemContainer = item.find("h3.ytLockupMetadataViewModelHeadingReset");
            var titleItem = titleItemContainer.find("a.ytLockupMetadataViewModelTitle");

            if (titleItem.length === 0) {
                // BUGFIX: Detach and preserve the IA button before clearing the container
                var preservedIAButon = titleItemContainer.find(".ia_button").detach();

                // Clear the container safely
                titleItemContainer[0].textContent = '';

                var newTitleAnchor = document.createElement('a');
                newTitleAnchor.className = 'ytLockupMetadataViewModelTitle';
                newTitleAnchor.setAttribute('aria-haspopup', 'false');
                newTitleAnchor.href = '/watch?v=' + meta.id;

                var newTitleSpan = document.createElement('span');
                newTitleSpan.className = 'ytAttributedStringHost ytAttributedStringWhiteSpacePreWrap';
                newTitleSpan.dir = 'auto';
                newTitleSpan.setAttribute('role', 'text');

                newTitleAnchor.appendChild(newTitleSpan);
                titleItemContainer[0].appendChild(newTitleAnchor);

                // Restore the IA button back to the container
                if (preservedIAButon.length > 0) {
                    titleItemContainer.prepend(preservedIAButon);
                }

                titleItem = $(newTitleAnchor);
            }

            var targetTextElement = titleItem.find("span").length ? titleItem.find("span") : titleItem;
            targetTextElement.text(meta.title);
            titleItem.attr("title", meta.title);
            titleItem.attr("aria-label", meta.title);
            titleItem.addClass("filmot_title");

            if (darkMode == -1) {
                var lum = rgb2lum(targetTextElement.css("color"));
                darkMode = (lum > 0.51) ? 1 : 0;
            }

            item.find(".ytLockupViewModelHost").css("background-color", (darkMode == 0) ? lightModeBackground : darkModeBackground);

            // 2. Handle New Channel Info Structure via createElement
            var metaViewModel = item.find("yt-content-metadata-view-model");
            metaViewModel.find(".filmot_c_row").remove();

            var channelRow = document.createElement('div');
            channelRow.setAttribute('role', 'group');
            channelRow.className = 'ytContentMetadataViewModelMetadataRow filmot_c_row';

            var channelSpanOuter = document.createElement('span');
            channelSpanOuter.className = 'ytAttributedStringHost ytContentMetadataViewModelMetadataText ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor';
            channelSpanOuter.dir = 'auto';

            var channelSpanInner = document.createElement('span');
            channelSpanInner.dir = 'auto';
            channelSpanInner.style.fontWeight = '400';

            var channelLinkElement = document.createElement('a');
            channelLinkElement.className = 'ytAttributedStringLink ytAttributedStringLinkCallToActionColor ytAttributedStringLinkInheritColor filmot_c_link';
            channelLinkElement.setAttribute('tabindex', '0');
            channelLinkElement.setAttribute('force-new-state', 'true');
            channelLinkElement.href = 'https://www.youtube.com/channel/' + meta.channelid;
            channelLinkElement.textContent = meta.channelname;

            if (darkMode == 1) {
                channelLinkElement.style.color = darkModeLinkColor;
            }

            channelSpanInner.appendChild(channelLinkElement);
            channelSpanOuter.appendChild(channelSpanInner);
            channelRow.appendChild(channelSpanOuter);

            metaViewModel.prepend(channelRow);

            // 3. Handle New Image/Thumbnail Structure via createElement
            item.find(".filmot_newimg").remove();

            var newThumbElement = document.createElement('img');
            newThumbElement.id = 'filmot_newimg';
            newThumbElement.className = 'ytCoreImageHost ytCoreImageFillParentHeight ytCoreImageFillParentWidth ytCoreImageContentModeScaleAspectFill ytCoreImageLoaded filmot_newimg';
            newThumbElement.alt = '';
            newThumbElement.src = 'https://filmot.com/vi/' + meta.id + '/default.jpg';
            newThumbElement.title = escapedTitle;
            newThumbElement.onclick = function(event) {
                prompt('Full Title', escapedTitle);
                event.stopPropagation();
                return false;
            };

            var thumbContainer = item.find(".ytThumbnailViewModelImage");
            if(thumbContainer.length) {
                 thumbContainer[0].appendChild(newThumbElement);
            }

            item.find(".ytThumbnailViewModelImage img.ytCoreImageHost").not(".filmot_newimg").addClass("filmot_hide").hide();

            // 4. Add Filmot button on the far right of the Title Section
            let filmotButtonJQ = item.find("a#button-view-filmot");
            if (filmotButtonJQ.length) {
                // Button already exists, just update the URL
                filmotButtonJQ.attr("href", "https://filmot.com/video/" + meta.id);
            } else {
                var filmotAnchor = document.createElement('a');
                filmotAnchor.id = "button-view-filmot";
                filmotAnchor.className = "filmot_button";
                filmotAnchor.href = "https://filmot.com/video/" + meta.id;
                filmotAnchor.target = "_blank";
                filmotAnchor.title = "View on Filmot";

                // Explicit styles to structure it on the far right of the title row
                filmotAnchor.style.float = "right";
                filmotAnchor.style.marginLeft = "10px";
                filmotAnchor.style.backgroundColor = "#065fd4"; // YouTube Active Blue
                filmotAnchor.style.color = "#ffffff";
                filmotAnchor.style.padding = "2px 8px";
                filmotAnchor.style.borderRadius = "4px";
                filmotAnchor.style.display = "inline-flex";
                filmotAnchor.style.alignItems = "center";
                filmotAnchor.style.fontFamily = "Roboto, Arial, sans-serif";
                filmotAnchor.style.fontSize = "12px";
                filmotAnchor.style.fontWeight = "bold";
                filmotAnchor.style.textDecoration = "none";
                filmotAnchor.style.cursor = "pointer";

                var icon = document.createElement('img');
                icon.src = "https://www.google.com/s2/favicons?domain=filmot.com";
                icon.style.marginRight = "4px";
                icon.style.width = "12px";
                icon.style.height = "12px";

                var textSpan = document.createElement('span');
                textSpan.innerText = "Filmot";
                textSpan.style.lineHeight = "1";

                filmotAnchor.appendChild(icon);
                filmotAnchor.appendChild(textSpan);

                // Prepend to the title container row to sit alongside the link and IA button
                if (titleItemContainer.length) {
                    titleItemContainer.css("display", "block");
                    titleItemContainer.prepend($(filmotAnchor));
                }
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
