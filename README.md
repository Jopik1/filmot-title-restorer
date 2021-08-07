# filmot-title-restorer
Tampermonkey user script that restores titles for removed or private videos in YouTube playlists


Changelog:
    
    Added support for dark mode (highlight and link color adjust appropriately when script executes)
    Added support for full format playlists
    Clicking on restored thumbnail displays the full title in a prompt text box (can be copied)
    Clicking on channel name will open the channel in a new tab
    Optimized jQuery selector access
    Fixed case where script was loaded after yt-navigate-finish already fired and button wasn't loading
    Added full title as a tooltip/title
    Switch to fetching data using AJAX instead of injecting a JSONP script (more secure)
    
