import type { PresetConfig } from './types/caddy';

export const presets: PresetConfig[] = [
  // Media & Streaming
  {
    name: 'Navidrome',
    port: 4533,
    description: 'Modern, lightweight music server and streamer compatible with the Subsonic/Airsonic API. Fast, simple, and supports large music libraries.',
    category: 'Media & Streaming',
    webLink: 'https://www.navidrome.org',
    githubLink: 'https://github.com/navidrome/navidrome'
  },
  {
    name: 'Audiobookshelf',
    port: 13378,
    description: 'Self-hosted audiobook and podcast server with a mobile-friendly web UI, progress syncing, and metadata fetching.',
    category: 'Media & Streaming',
    webLink: 'https://www.audiobookshelf.org',
    githubLink: 'https://github.com/advplyr/audiobookshelf'
  },
  {
    name: 'Immich',
    port: 2283,
    description: 'High-performance self-hosted photo and video backup solution. Offers automatic mobile backup, facial recognition, and a Google Photos-like UI.',
    category: 'Media & Streaming',
    webLink: 'https://immich.app',
    githubLink: 'https://github.com/immich-app/immich'
  },
  {
    name: 'PhotoPrism',
    port: 2342,
    description: 'AI-powered photo management app with automatic tagging, face recognition, and map views. Works without cloud dependence.',
    category: 'Media & Streaming',
    webLink: 'https://www.photoprism.app',
    githubLink: 'https://github.com/photoprism/photoprism'
  },
  {
    name: 'Kavita',
    port: 5000,
    description: 'Fast, feature-rich self-hosted digital library for manga, comics, and books with reader apps and OPDS support.',
    category: 'Media & Streaming',
    webLink: 'https://www.kavitareader.com',
    githubLink: 'https://github.com/Kareadita/Kavita'
  },
  {
    name: 'Komga',
    port: 8080,
    description: 'Media server for comics, manga, and webtoons with a web reader and REST API. Supports CBZ, CBR, PDF, and EPUB.',
    category: 'Media & Streaming',
    webLink: 'https://komga.org',
    githubLink: 'https://github.com/gotson/komga'
  },
  {
    name: 'Jellyfin',
    port: 8096,
    description: 'Open-source media server for movies, TV shows, music, and more. Offers DVR functionality, user management, and a fully featured web client.',
    category: 'Media & Streaming',
    webLink: 'https://jellyfin.org',
    githubLink: 'https://github.com/jellyfin/jellyfin',
    logo: '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="110.25" x2="496.14" y1="213.3" y2="436.09"><stop offset="0" stop-color="#aa5cc3"/><stop offset="1" stop-color="#00a4dc"/></linearGradient><g fill="url(#a)"><path d="m256 201.6c-20.4 0-86.2 119.3-76.2 139.4s142.5 19.9 152.4 0-55.7-139.4-76.2-139.4z"/><path d="m256 23.3c-61.6 0-259.8 359.4-229.6 420.1s429.3 60 459.2 0-168-420.1-229.6-420.1zm150.5 367.5c-19.6 39.3-281.1 39.8-300.9 0s110.1-275.3 150.4-275.3 170.1 235.9 150.5 275.3z"/></g></svg>'
  },
  {
    name: 'Plex',
    port: 32400,
    description: 'Popular media server for organizing and streaming personal movies, TV shows, music, and photos. Features cloud integration, remote access, and apps for most platforms.',
    category: 'Media & Streaming',
    webLink: 'https://www.plex.tv',
    // Plex has some projects on GitHub, but the core server is closed source:
    // githubLink: 'https://github.com/plexinc' 
    logo: '<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="m298.8 502.3c0 81.7-58 143.3-133.7 143.3-35.1 0-60.1-10.2-82.4-33.9v52.7c0 20.3-4 38.5-22.3 54-20.8 17.6-49.2 11.5-54.6 10.2-4-.7-5.4-1.3-5.4-1.3v-366.1h76.9v29.7c21.6-27 47.3-38.5 87.2-38.5 78.3 0 134.3 61.4 134.3 149.9zm-72.9-3.4c0-43.2-33.1-76.3-76.3-76.3-36.4 0-76.3 33.8-76.3 75.7 0 42.5 33.8 77.7 76.3 77.7s76.3-33.9 76.3-77.1z" fill="#fff" fill-rule="evenodd"/><path d="m408.2 493.5c0 31.8 3.3 70.3 34.4 112.1.7.7 2 2.8 2 2.8-12.8 21.6-28.3 36.4-49.3 36.4-16.2 0-32.4-8.7-45.9-23.6-14.1-16.2-20.9-37.2-20.9-59.4v-291.8h79.1z" fill="#fff"/><path d="m799 636.1h-95.8l93.2-137.2-93.2-137.7h95.8l92.6 137.7z" fill="#ebaf00"/><g fill="#fff"><path d="m869.3 411.8 34.4-50.6h95.9l-83.1 122.2zm48 102.8c.6 2 28.3 46.5 49.3 70.9 15.5 18.2 27.7 29 27.7 29-6.8 8.1-24.4 29.7-49.3 30.4-23.6 0-43.9-12.1-59.5-36.5l-16.2-22.3z"/><path d="m718.1 557c-26.4 56-74.9 87.8-131 87.8-80.4 0-144.5-64.2-144.5-145.2 0-81.7 64.1-147.2 142.4-147.2 82.4 0 145.2 64.2 145.2 149.9 0 8.9-.7 14.3-2 18.2h-211.3c3.4 31.1 26.3 59.5 66.2 59.5 22.2 0 33-8.1 49.3-23zm-198.6-86.4h133.7c-6.1-30.4-32.4-53.4-67.5-53.4-34.4 0-59.4 21.6-66.2 53.4z" fill-rule="evenodd"/></g></svg>'
  },
  {
    name: 'Emby',
    port: 8096,
    description: 'Media server alternative focusing on live TV, DVR support, and media management. Similar to Plex and Jellyfin but with a proprietary freemium model.',
    category: 'Media & Streaming',
    webLink: 'https://emby.media',
    // Emby is partially closed source; no official GitHub for the server:
    // githubLink: 'https://github.com/MediaBrowser/Emby' 
    logo: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m11.041 0c-.007 0-1.456 1.43-3.219 3.176l-3.207 3.176.512.513.512.512-2.819 2.791-2.82 2.793 1.83 1.848c1.006 1.016 2.438 2.46 3.182 3.209l1.351 1.359.508-.496c.28-.273.515-.498.524-.498.008 0 1.266 1.264 2.794 2.808l2.781 2.809.187-.182c.23-.225 5.007-4.95 5.717-5.656l.52-.516-.502-.513c-.276-.282-.5-.52-.496-.53.003-.009 1.264-1.26 2.802-2.783 1.538-1.522 2.8-2.776 2.803-2.785.005-.012-3.617-3.684-6.107-6.193l-.244-.242-.505.505c-.279.278-.517.501-.53.497-.013-.005-1.27-1.267-2.793-2.805a449.655 449.655 0 0 0 -2.781-2.797zm-1.818 7.367c.091.038 7.951 4.608 7.957 4.627.003.013-1.781 1.056-3.965 2.32a999.898 999.898 0 0 1 -3.996 2.307c-.019.006-.026-1.266-.026-4.629 0-3.7.007-4.634.03-4.625z"/></svg>'
  },
  {
    name: 'Subsonic',
    port: 4040,
    description: 'Music streaming server designed for easy access to your music library from anywhere. Airsonic is the open-source fork of Subsonic.',
    category: 'Media & Streaming',
    webLink: 'http://www.subsonic.org',
    // If you wish to link the open-source fork (Airsonic):
    // githubLink: 'https://github.com/airsonic/airsonic'
  },

  // Downloaders & File Sharing
  {
    name: 'Syncthing',
    port: 8384,
    description: 'Continuous file synchronization program that syncs files between two or more computers in real time, without a central server.',
    category: 'Downloaders & File Sharing',
    webLink: 'https://syncthing.net',
    githubLink: 'https://github.com/syncthing/syncthing'
  },
  {
    name: 'Filebrowser',
    port: 8080,
    description: 'Web-based file manager with a clean UI. Upload, delete, preview, rename, and share files directly from a browser.',
    category: 'Downloaders & File Sharing',
    webLink: 'https://filebrowser.org',
    githubLink: 'https://github.com/filebrowser/filebrowser'
  },
  {
    name: 'SABnzbd',
    port: 8080,
    description: 'A user-friendly Usenet download manager that supports automation, scheduling, and categories for organizing downloaded media.',
    category: 'Downloaders & File Sharing',
    webLink: 'https://sabnzbd.org',
    githubLink: 'https://github.com/sabnzbd/sabnzbd',
    logo: '<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="m200.4 39.3h598.1v437.8h161l-460.1 483-460-483.1h161z" stroke="#000" stroke-linejoin="round" stroke-width="74"/><path d="m200.4 39.3h598.1v437.8h161l-460.1 483-460-483h161z" fill="#ffb300" fill-rule="evenodd"/><path d="m499.4 960.2-298.3-920.8h596.7z" fill="#ffca28" fill-rule="evenodd"/><path d="m329.2 843.5h-246.2v-51.8h146.1v-45.9h-146.1v-148.9h246.2v51.5h-146.1v45.9h146.1zm292.2 0h-246.2v-149.2h146.1v-45.9h-146.1v-51.5h246.2zm-146.1-97.8h46v46h-46zm192.1 97.8v-344h100.1v97.4h146.1v246.6zm100.1-195.2h46v143.4h-46z" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="74"/><path d="m329.2 843.5h-246.2v-51.8h146.1v-45.9h-146.1v-148.9h246.2v51.5h-146.1v45.9h146.1zm292.2 0h-246.2v-149.2h146.1v-45.9h-146.1v-51.5h246.2zm-146.1-51.8h46v-46h-46zm192.1 51.9v-344h100.1v97.4h146.1v246.6zm100.1-51.9h46v-143.3h-46z" fill="#fff" fill-rule="evenodd"/></svg>'
  },
  {
    name: 'NZBGet',
    port: 6789,
    description: 'Efficient, lightweight Usenet downloader with low resource usage. Focuses on performance and can run on devices with minimal specs (e.g., Raspberry Pi).',
    category: 'Downloaders & File Sharing',
    webLink: 'https://nzbget.net',
    githubLink: 'https://github.com/nzbget/nzbget'
  },
  {
    name: 'qBittorrent',
    port: 8080,
    description: 'Popular BitTorrent client with an embedded, user-friendly web interface. Offers features like RSS downloading, remote control, and search.',
    category: 'Downloaders & File Sharing',
    webLink: 'https://www.qbittorrent.org',
    githubLink: 'https://github.com/qbittorrent/qBittorrent',
    logo: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="21.5"/><path d="m26.6511 22.3638c0-2.7805 2.254-5.0345 5.0345-5.0345 2.7805 0 5.0345 2.254 5.0345 5.0345v3.2724c0 2.7805-2.254 5.0345-5.0345 5.0345-2.7805 0-5.0345-2.254-5.0345-5.0345"/><path d="m26.6511 30.6707v-20.138"/><path d="m21.3489 25.6362c0 2.7805-2.254 5.0345-5.0345 5.0345-2.7805 0-5.0345-2.254-5.0345-5.0345v-3.2724c0-2.7805 2.254-5.0345 5.0345-5.0345 2.7805 0 5.0345 2.254 5.0345 5.0345"/><path d="m21.3489 17.3293v20.138"/></g></svg>'
  },
  {
    name: 'Transmission',
    port: 9091,
    description: 'Cross-platform BitTorrent client known for its simplicity and low resource consumption. Features a minimal web interface for remote management.',
    category: 'Downloaders & File Sharing',
    webLink: 'https://transmissionbt.com',
    githubLink: 'https://github.com/transmission/transmission'
  },
  {
    name: 'Deluge',
    port: 8112,
    description: 'Flexible BitTorrent client that can be controlled via a standalone desktop client, web UI, or console. Plug-in support for extra functionality.',
    category: 'Downloaders & File Sharing',
    webLink: 'https://deluge-torrent.org',
    githubLink: 'https://github.com/deluge-torrent/deluge'
  },
  {
    name: 'PyLoad',
    port: 8000,
    description: 'Lightweight downloader focusing on one-click hosting sites, supporting parallel downloads and link decryption.',
    category: 'Downloaders & File Sharing',
    webLink: 'https://pyload.net',
    githubLink: 'https://github.com/pyload/pyload'
  },

  // Media Management & Automation
  {
    name: 'Readarr',
    port: 8787,
    description: 'Book management tool in the *arr family. Automates downloading and organizing ebooks and audiobooks from Usenet and torrents.',
    category: 'Media Management & Automation',
    webLink: 'https://readarr.com',
    githubLink: 'https://github.com/Readarr/Readarr'
  },
  {
    name: 'Bazarr',
    port: 6767,
    description: 'Subtitle management companion for Sonarr and Radarr. Automatically searches and downloads subtitles for your media library.',
    category: 'Media Management & Automation',
    webLink: 'https://www.bazarr.media',
    githubLink: 'https://github.com/morpheus65535/bazarr'
  },
  {
    name: 'Tdarr',
    port: 8265,
    description: 'Distributed media transcoding automation system. Manages transcoding queues across multiple nodes to convert and compress media files.',
    category: 'Media Management & Automation',
    webLink: 'https://tdarr.io',
    githubLink: 'https://github.com/HaveAGitGat/Tdarr'
  },
  {
    name: 'Jellyseerr',
    port: 5055,
    description: 'Media request management system for Jellyfin, Emby, and Plex. Fork of Overseerr with first-class Jellyfin support.',
    category: 'Media Management & Automation',
    webLink: 'https://docs.jellyseerr.dev',
    githubLink: 'https://github.com/Fallenbagel/jellyseerr'
  },
  {
    name: 'Sonarr',
    port: 8989,
    description: 'TV series management tool that integrates with torrent and Usenet clients. Automatically searches, downloads, and renames TV episodes.',
    category: 'Media Management & Automation',
    webLink: 'https://sonarr.tv',
    githubLink: 'https://github.com/Sonarr/Sonarr'
  },
  {
    name: 'Radarr',
    port: 7878,
    description: 'Movie management companion for Sonarr. Automates downloading, sorting, and renaming of movie files.',
    category: 'Media Management & Automation',
    webLink: 'https://radarr.video',
    githubLink: 'https://github.com/Radarr/Radarr'
  },
  {
    name: 'Lidarr',
    port: 8686,
    description: 'Music management tool in the same family as Sonarr and Radarr. Automates music downloads and organizes libraries.',
    category: 'Media Management & Automation',
    webLink: 'https://lidarr.audio',
    githubLink: 'https://github.com/Lidarr/Lidarr'
  },
  {
    name: 'Prowlarr',
    port: 9696,
    description: 'Indexer manager that integrates with Sonarr, Radarr, Lidarr, and other tools. Provides unified management of torrent and Usenet indexers.',
    category: 'Media Management & Automation',
    webLink: 'https://prowlarr.com',
    githubLink: 'https://github.com/Prowlarr/Prowlarr'
  },
  {
    name: 'Overseerr',
    port:5055,
    description: 'Media request management system for Plex, Emby, or Jellyfin libraries. Allows users to request new media content and track requests.',
    category: 'Media Management & Automation',
    webLink: 'https://overseerr.dev',
    githubLink: 'https://github.com/sct/overseerr'
  },
  {
    name: 'Jackett',
    port: 9117,
    description: 'Indexer aggregator that translates queries from management apps (Sonarr, Radarr, etc.) into tracker-specific web requests.',
    category: 'Media Management & Automation',
    webLink: 'https://jackett.dev',
    githubLink: 'https://github.com/Jackett/Jackett'
  },
  {
    name: 'CouchPotato',
    port: 5050,
    description: 'An older movie automation tool. It\'s largely replaced by Radarr, but still used by some for historical reasons.',
    category: 'Media Management & Automation',
    webLink: 'https://couchpota.to',
    githubLink: 'https://github.com/CouchPotato/CouchPotatoServer'
  },

  // Home Automation & IoT
  {
    name: 'ESPHome',
    port: 6052,
    description: 'System for controlling ESP8266/ESP32 microcontrollers via simple configuration files. Integrates tightly with Home Assistant.',
    category: 'Home Automation & IoT',
    webLink: 'https://esphome.io',
    githubLink: 'https://github.com/esphome/esphome'
  },
  {
    name: 'Frigate',
    port: 5000,
    description: 'NVR with real-time local object detection for IP cameras. Uses AI to detect people, vehicles, and more with minimal false positives.',
    category: 'Home Automation & IoT',
    webLink: 'https://frigate.video',
    githubLink: 'https://github.com/blakeblackshear/frigate'
  },
  {
    name: 'Zigbee2MQTT',
    port: 8080,
    description: 'Bridges Zigbee devices to MQTT, allowing them to be used without vendor cloud services. Supports hundreds of devices.',
    category: 'Home Automation & IoT',
    webLink: 'https://www.zigbee2mqtt.io',
    githubLink: 'https://github.com/Koenkk/zigbee2mqtt'
  },
  {
    name: 'Home Assistant',
    port: 8123,
    description: 'Powerful home automation platform with extensive support for integrations (lights, switches, sensors, media players). A central hub for smart home setups.',
    category: 'Home Automation & IoT',
    webLink: 'https://www.home-assistant.io',
    githubLink: 'https://github.com/home-assistant/core'
  },
  {
    name: 'Node-RED',
    port: 1880,
    description: 'Flow-based development tool for wiring together hardware devices, APIs, and online services. Great for visual automation and IoT projects.',
    category: 'Home Automation & IoT',
    webLink: 'https://nodered.org',
    githubLink: 'https://github.com/node-red/node-red'
  },
  {
    name: 'openHAB',
    port: 8080,
    description: 'Open-source, technology-agnostic home automation platform supporting numerous smart home devices and services.',
    category: 'Home Automation & IoT',
    webLink: 'https://www.openhab.org',
    githubLink: 'https://github.com/openhab/openhab-core'
  },

  // Development & Code Hosting
  {
    name: 'Forgejo',
    port: 3000,
    description: 'Community-driven, self-hosted Git service forked from Gitea. Lightweight, fast, and fully compatible with Gitea.',
    category: 'Development & Code Hosting',
    webLink: 'https://forgejo.org',
    githubLink: 'https://codeberg.org/forgejo/forgejo'
  },
  {
    name: 'Woodpecker CI',
    port: 8000,
    description: 'Community fork of Drone CI. Simple, container-native CI/CD with tight Gitea and Forgejo integration.',
    category: 'Development & Code Hosting',
    webLink: 'https://woodpecker-ci.org',
    githubLink: 'https://github.com/woodpecker-ci/woodpecker'
  },
  {
    name: 'Coolify',
    port: 8000,
    description: 'Self-hosted Heroku/Netlify alternative. Deploy apps, databases, and services from Git repos with a clean dashboard.',
    category: 'Development & Code Hosting',
    webLink: 'https://coolify.io',
    githubLink: 'https://github.com/coollabsio/coolify'
  },
  {
    name: 'GitLab',
    port: 80,
    description: 'Comprehensive self-hosted Git service with built-in CI/CD, issue tracking, wikis, and more. A robust all-in-one DevOps platform.',
    category: 'Development & Code Hosting',
    webLink: 'https://about.gitlab.com',
    // Primary code is hosted at GitLab:
    githubLink: 'https://gitlab.com/gitlab-org/gitlab'
  },
  {
    name: 'Gitea',
    port: 3000,
    description: 'Lightweight, self-hosted Git service. Ideal for smaller teams or individuals who want a simpler, resource-friendly solution.',
    category: 'Development & Code Hosting',
    webLink: 'https://gitea.io',
    githubLink: 'https://github.com/go-gitea/gitea'
  },
  {
    name: 'Jenkins',
    port: 8080,
    description: 'Leading open-source automation server for CI/CD pipelines. Highly extensible with hundreds of plugins.',
    category: 'Development & Code Hosting',
    webLink: 'https://www.jenkins.io',
    githubLink: 'https://github.com/jenkinsci/jenkins'
  },
  {
    name: 'Drone CI',
    port: 8000,
    description: 'Container-native CI/CD platform. Integrates tightly with GitHub, GitLab, and Gitea, and emphasizes minimal configuration.',
    category: 'Development & Code Hosting',
    webLink: 'https://www.drone.io',
    githubLink: 'https://github.com/harness/drone'
  },

  // Monitoring & Analytics
  {
    name: 'InfluxDB',
    port: 8086,
    description: 'High-performance time-series database designed for storing metrics, events, and analytics data. Commonly paired with Grafana.',
    category: 'Monitoring & Analytics',
    webLink: 'https://www.influxdata.com',
    githubLink: 'https://github.com/influxdata/influxdb'
  },
  {
    name: 'Scrutiny',
    port: 8080,
    description: 'Hard drive health dashboard using S.M.A.R.T data. Monitors disk health trends and sends alerts on failures.',
    category: 'Monitoring & Analytics',
    webLink: 'https://github.com/AnalogJ/scrutiny',
    githubLink: 'https://github.com/AnalogJ/scrutiny'
  },
  {
    name: 'Glances',
    port: 61208,
    description: 'Cross-platform system monitoring tool with a web UI. Shows CPU, memory, disk, and network stats in real time.',
    category: 'Monitoring & Analytics',
    webLink: 'https://nicolargo.github.io/glances',
    githubLink: 'https://github.com/nicolargo/glances'
  },
  {
    name: 'ntfy',
    port: 80,
    description: 'Simple HTTP-based pub-sub notification service. Send push notifications to your phone or desktop from scripts or apps.',
    category: 'Monitoring & Analytics',
    webLink: 'https://ntfy.sh',
    githubLink: 'https://github.com/binwiederhier/ntfy'
  },
  {
    name: 'Grafana',
    port: 3000,
    description: 'Analytics and visualization platform, typically used with time-series databases like Prometheus or InfluxDB. Flexible dashboards and alerts.',
    category: 'Monitoring & Analytics',
    webLink: 'https://grafana.com',
    githubLink: 'https://github.com/grafana/grafana'
  },
  {
    name: 'Prometheus',
    port: 9090,
    description: 'Monitoring system and time-series database. Gathers metrics via a pull model, often coupled with Grafana for visualization.',
    category: 'Monitoring & Analytics',
    webLink: 'https://prometheus.io',
    githubLink: 'https://github.com/prometheus/prometheus'
  },
  {
    name: 'Uptime Kuma',
    port: 3001,
    description: 'Self-hosted uptime monitoring tool with a clean UI, multiple protocol checks (HTTP, TCP, etc.), and alerting features.',
    category: 'Monitoring & Analytics',
    webLink: 'https://uptime.kuma.pet',
    githubLink: 'https://github.com/louislam/uptime-kuma'
  },
  {
    name: 'Netdata',
    port: 19999,
    description: 'Real-time performance monitoring for systems and applications, offering interactive visualizations and a minimal configuration process.',
    category: 'Monitoring & Analytics',
    webLink: 'https://www.netdata.cloud',
    githubLink: 'https://github.com/netdata/netdata'
  },
  {
    name: 'Kibana',
    port: 5601,
    description: 'Front-end visualization tool for Elasticsearch. Helps analyze logs and metrics via advanced dashboards and searching capabilities.',
    category: 'Monitoring & Analytics',
    webLink: 'https://www.elastic.co/kibana',
    githubLink: 'https://github.com/elastic/kibana'
  },
  {
    name: 'Loki',
    port: 3100,
    description: 'Log aggregation system by Grafana Labs. Integrates well with Prometheus and Grafana to provide a cohesive monitoring stack.',
    category: 'Monitoring & Analytics',
    webLink: 'https://grafana.com/oss/loki',
    githubLink: 'https://github.com/grafana/loki'
  },

  // Productivity & Collaboration
  {
    name: 'Wiki.js',
    port: 3000,
    description: 'Modern, powerful wiki platform built on Node.js. Supports Markdown, rich text editing, and various storage backends including Git.',
    category: 'Productivity & Collaboration',
    webLink: 'https://js.wiki',
    githubLink: 'https://github.com/requarks/wiki'
  },
  {
    name: 'Paperless-ngx',
    port: 8000,
    description: 'Document management system that transforms physical documents into a searchable online archive with OCR, tagging, and smart filtering.',
    category: 'Productivity & Collaboration',
    webLink: 'https://docs.paperless-ngx.com',
    githubLink: 'https://github.com/paperless-ngx/paperless-ngx'
  },
  {
    name: 'Mealie',
    port: 9000,
    description: 'Self-hosted recipe manager and meal planner with a clean UI. Import recipes from URLs, plan weekly meals, and generate shopping lists.',
    category: 'Productivity & Collaboration',
    webLink: 'https://mealie.io',
    githubLink: 'https://github.com/mealie-recipes/mealie'
  },
  {
    name: 'Joplin Server',
    port: 22300,
    description: 'Self-hosted sync server for Joplin, the open-source note-taking app. Syncs notes and notebooks across all your devices.',
    category: 'Productivity & Collaboration',
    webLink: 'https://joplinapp.org',
    githubLink: 'https://github.com/laurent22/joplin'
  },
  {
    name: 'Outline',
    port: 3000,
    description: 'Team knowledge base and wiki built for fast, collaborative editing. Markdown support, integrations with Slack and GitHub.',
    category: 'Productivity & Collaboration',
    webLink: 'https://www.getoutline.com',
    githubLink: 'https://github.com/outline/outline'
  },
  {
    name: 'Wallabag',
    port: 80,
    description: 'Self-hosted read-it-later application. Save articles and web pages for offline reading, with tagging and full-text search.',
    category: 'Productivity & Collaboration',
    webLink: 'https://wallabag.org',
    githubLink: 'https://github.com/wallabag/wallabag'
  },
  {
    name: 'Linkwarden',
    port: 3000,
    description: 'Self-hosted bookmark manager with automatic webpage archiving and full-text search. Share collections with your team.',
    category: 'Productivity & Collaboration',
    webLink: 'https://linkwarden.app',
    githubLink: 'https://github.com/linkwarden/linkwarden'
  },
  {
    name: 'Nextcloud',
    port: 8080,
    description: 'Self-hosted productivity platform that includes file syncing, collaborative document editing, calendar, contacts, and more.',
    category: 'Productivity & Collaboration',
    webLink: 'https://nextcloud.com',
    githubLink: 'https://github.com/nextcloud/server'
  },
  {
    name: 'OnlyOffice',
    port: 8081,
    description: 'Self-hosted office suite enabling online editing of text documents, spreadsheets, and presentations. Often paired with Nextcloud.',
    category: 'Productivity & Collaboration',
    webLink: 'https://www.onlyoffice.com',
    githubLink: 'https://github.com/ONLYOFFICE/DocumentServer'
  },
  {
    name: 'Etherpad',
    port: 9001,
    description: 'Real-time collaborative text editor. Allows multiple users to edit documents simultaneously and view changes in real time.',
    category: 'Productivity & Collaboration',
    webLink: 'https://etherpad.org',
    githubLink: 'https://github.com/ether/etherpad-lite'
  },
  {
    name: 'CryptPad',
    port: 3002,
    description: 'Privacy-first collaboration suite (documents, polls, kanbans) with end-to-end encryption.',
    category: 'Productivity & Collaboration',
    webLink: 'https://cryptpad.fr',
    githubLink: 'https://github.com/xwiki-labs/cryptpad'
  },
  {
    name: 'BookStack',
    port: 80,
    description: 'Simple, user-friendly wiki platform for storing notes, documentation, and knowledge bases.',
    category: 'Productivity & Collaboration',
    webLink: 'https://www.bookstackapp.com',
    githubLink: 'https://github.com/BookStackApp/BookStack'
  },

  // Authentication & Identity
  {
    name: 'Authentik',
    port: 9000,
    description: 'Flexible, self-hosted identity provider supporting SSO, OAuth2, SAML, LDAP, and SCIM. Good Keycloak alternative with a modern UI.',
    category: 'Authentication & Identity',
    webLink: 'https://goauthentik.io',
    githubLink: 'https://github.com/goauthentik/authentik'
  },
  {
    name: 'LLDAP',
    port: 17170,
    description: 'Lightweight LDAP server implementation for simple user management. Designed to work as a backend for authentication services.',
    category: 'Authentication & Identity',
    webLink: 'https://github.com/lldap/lldap',
    githubLink: 'https://github.com/lldap/lldap'
  },
  {
    name: 'Keycloak',
    port: 8080,
    description: 'Open-source identity and access management solution. Provides single sign-on (SSO), identity brokering, and social login integration.',
    category: 'Authentication & Identity',
    webLink: 'https://www.keycloak.org',
    githubLink: 'https://github.com/keycloak/keycloak'
  },
  {
    name: 'Authelia',
    port: 9091,
    description: 'Modern, self-hosted authentication and authorization server for securing reverse proxies. Often used with Traefik, Caddy, or Nginx.',
    category: 'Authentication & Identity',
    webLink: 'https://www.authelia.com',
    githubLink: 'https://github.com/authelia/authelia'
  },

  // Security & Networking
  {
    name: 'AdGuard Home',
    port: 3000,
    description: 'Network-wide ad and tracker blocking DNS server. Alternative to Pi-hole with a modern UI and built-in HTTPS/DoH/DoT support.',
    category: 'Security & Networking',
    webLink: 'https://adguard.com/en/adguard-home/overview.html',
    githubLink: 'https://github.com/AdguardTeam/AdGuardHome'
  },
  {
    name: 'WG-Easy',
    port: 51821,
    description: 'The easiest way to run WireGuard VPN with a simple web UI for managing clients, QR codes, and connection stats.',
    category: 'Security & Networking',
    webLink: 'https://github.com/wg-easy/wg-easy',
    githubLink: 'https://github.com/wg-easy/wg-easy'
  },
  {
    name: 'Headscale',
    port: 8080,
    description: 'Self-hosted implementation of the Tailscale control server. Manage your own Tailscale-compatible mesh VPN network.',
    category: 'Security & Networking',
    webLink: 'https://headscale.net',
    githubLink: 'https://github.com/juanfont/headscale'
  },
  {
    name: 'Pi-hole',
    port: 80,
    description: 'Network-wide ad blocking and DNS management solution that can block ads and trackers at the DNS level.',
    category: 'Security & Networking',
    webLink: 'https://pi-hole.net',
    githubLink: 'https://github.com/pi-hole/pi-hole'
  },
  {
    name: 'Unifi Controller',
    port: 8443,
    description: 'Management interface for UniFi network devices (access points, switches, gateways). Provides centralized configuration and monitoring.',
    category: 'Security & Networking',
    webLink: 'https://unifi.ui.com',
    // The UniFi Controller is not fully open source:
    // githubLink: 'https://github.com/ubiquiti'
  },

  // Container & Server Management
  {
    name: 'Dockge',
    port: 5001,
    description: 'Self-hosted Docker Compose stack manager with a reactive UI. Create, edit, start, stop, and monitor stacks with ease.',
    category: 'Container & Server Management',
    webLink: 'https://dockge.kuma.pet',
    githubLink: 'https://github.com/louislam/dockge'
  },
  {
    name: 'Yacht',
    port: 8000,
    description: 'Container management UI focused on ease of use. Supports Docker and Docker Compose with a templating system for one-click deployments.',
    category: 'Container & Server Management',
    webLink: 'https://yacht.sh',
    githubLink: 'https://github.com/SelfhostedPro/Yacht'
  },
  {
    name: 'Cockpit',
    port: 9090,
    description: 'Web-based Linux server management UI. Manage storage, networking, containers, services, and users from a browser.',
    category: 'Container & Server Management',
    webLink: 'https://cockpit-project.org',
    githubLink: 'https://github.com/cockpit-project/cockpit'
  },
  {
    name: 'Portainer',
    port: 9000,
    description: 'Lightweight container management UI, supporting Docker, Docker Swarm, and Kubernetes. Simplifies container and image management.',
    category: 'Container & Server Management',
    webLink: 'https://www.portainer.io',
    githubLink: 'https://github.com/portainer/portainer'
  },
  {
    name: 'Docker Registry',
    port: 5000,
    description: 'Private Docker image registry for storing and distributing container images locally.',
    category: 'Container & Server Management',
    webLink: 'https://docs.docker.com/registry',
    githubLink: 'https://github.com/docker/distribution'
  },
  {
    name: 'Rancher',
    port: 80,
    description: 'Kubernetes management platform providing a GUI and centralized controls over multiple Kubernetes clusters.',
    category: 'Container & Server Management',
    webLink: 'https://rancher.com',
    githubLink: 'https://github.com/rancher/rancher'
  },

  // Password & Secrets Management
  {
    name: 'Passbolt',
    port: 443,
    description: 'Open-source password manager designed for teams. Role-based access, audit logs, and browser extension support.',
    category: 'Password & Secrets Management',
    webLink: 'https://www.passbolt.com',
    githubLink: 'https://github.com/passbolt/passbolt_api'
  },
  {
    name: 'Vaultwarden',
    port: 8080,
    description: 'Lightweight, self-hosted Bitwarden-compatible server for password management. Maintains core features with lower resource usage.',
    category: 'Password & Secrets Management',
    // The main site for the Vaultwarden project is its GitHub page:
    webLink: 'https://github.com/dani-garcia/vaultwarden',
    githubLink: 'https://github.com/dani-garcia/vaultwarden'
  },
  {
    name: 'HashiCorp Vault',
    port: 8200,
    description: 'Secure tool for secrets management, encryption, and access control. Can store API keys, passwords, certificates, and more.',
    category: 'Password & Secrets Management',
    webLink: 'https://www.vaultproject.io',
    githubLink: 'https://github.com/hashicorp/vault'
  },

  // Messaging & Communication
  {
    name: 'Matrix Synapse',
    port: 8008,
    description: 'Reference homeserver for the Matrix open federated messaging protocol. Powers decentralised, end-to-end encrypted chat.',
    category: 'Messaging & Communication',
    webLink: 'https://matrix.org',
    githubLink: 'https://github.com/element-hq/synapse'
  },
  {
    name: 'Gotify',
    port: 80,
    description: 'Simple self-hosted push notification server. Send notifications from scripts or apps to your devices via a REST API.',
    category: 'Messaging & Communication',
    webLink: 'https://gotify.net',
    githubLink: 'https://github.com/gotify/server'
  },
  {
    name: 'Zulip',
    port: 80,
    description: 'Threaded team chat designed for async communication. Open-source with apps for all major platforms and powerful search.',
    category: 'Messaging & Communication',
    webLink: 'https://zulip.com',
    githubLink: 'https://github.com/zulip/zulip'
  },
  {
    name: 'Rocket.Chat',
    port: 3000,
    description: 'Self-hosted team chat solution, similar to Slack. Supports channels, direct messages, audio/video calls, and screen sharing.',
    category: 'Messaging & Communication',
    webLink: 'https://rocket.chat',
    githubLink: 'https://github.com/RocketChat/Rocket.Chat'
  },
  {
    name: 'Mattermost',
    port: 8065,
    description: 'Open-source, self-hosted Slack alternative with integrations, theming, and enterprise features.',
    category: 'Messaging & Communication',
    webLink: 'https://mattermost.com',
    githubLink: 'https://github.com/mattermost/mattermost-server'
  },
  {
    name: 'The Lounge',
    port: 9001,
    description: 'Self-hosted web IRC client that stays connected even when you\'re offline. Includes multiple theme and plugin options.',
    category: 'Messaging & Communication',
    webLink: 'https://thelounge.chat',
    githubLink: 'https://github.com/thelounge/thelounge'
  }
];