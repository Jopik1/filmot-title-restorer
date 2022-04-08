# filmot-title-restorer
Tampermonkey user script that restores titles for removed or private videos in YouTube playlists


Changelog:

    08 April 2022
    Due to a YouTube format change version 0.34 did not work properly and erroneously detected working videos as deleted.
    Fixed by detecting the channel name which is missing on deleted videos in the current format.
    Please update to the current version - version 0.35.



    Added support for dark mode (highlight and link color adjust appropriately when script executes)
    
    Added support for full format playlists, For example: https://www.youtube.com/playlist?list=PLgAG0Ep5Hk9IJf24jeDYoYOfJyDFQFkwq
    Click on the ... button in the playlist menu and select "Show unavailable videos". Also works as you scroll the page.
    
    Clicking on restored thumbnail displays the full title in a prompt text box (can be copied)
    Clicking on channel name will open the channel in a new tab
    Optimized jQuery selector access
    Fixed case where script was loaded after yt-navigate-finish already fired and button wasn't loading
    Added full title as a tooltip/title
    Switch to fetching data using AJAX instead of injecting a JSONP script (more secure)
    

