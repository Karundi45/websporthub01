import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface SpotifyPlayerProps {
  className?: string;
}

export function SpotifyPlayer({ className }: SpotifyPlayerProps) {
  const [token, setToken] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerState, setPlayerState] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Check URL hash for access token
    const hash = window.location.hash;
    let _token = window.localStorage.getItem('spotify_token');

    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        _token = accessToken;
        window.localStorage.setItem('spotify_token', accessToken);
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    if (_token) {
      setToken(_token);
      initializeSpotifyPlayer(_token);
    }

    // Cleanup player on unmount
    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, []);

  const initializeSpotifyPlayer = (accessToken: string) => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new (window as any).Spotify.Player({
        name: 'Sport App Web Player',
        getOAuthToken: (cb: (token: string) => void) => { cb(accessToken); },
        volume: 0.5
      });

      setPlayer(spotifyPlayer);

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setIsPlayerReady(true);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsPlayerReady(false);
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setPlayerState(state);
      });

      spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Initialization Error', message);
      });
      spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Authentication Error', message);
        window.localStorage.removeItem('spotify_token');
        setToken(null);
      });
      spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Account Error', message);
      });

      spotifyPlayer.connect();
    };
  };

  const handleLogin = () => {
    if (!clientId) return alert('Please enter your Spotify Client ID');
    
    // Use the current URL as the redirect URI (it will come back to the applet)
    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-modify-playback-state'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
    window.location.href = authUrl;
  };

  const togglePlay = () => {
    if (player) {
      player.togglePlay();
    }
  };

  const nextTrack = () => {
    if (player) {
      player.nextTrack();
    }
  };

  const previousTrack = () => {
    if (player) {
      player.previousTrack();
    }
  };

  return (
    <div className={cn("bg-[#1e1e1e] border border-brand-border rounded-lg shadow-lg overflow-hidden transition-all duration-300 pointer-events-auto", className, isExpanded ? "w-64" : "w-14")}>
      {!token ? (
        <div className="flex flex-col h-full">
          {isExpanded ? (
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#1DB954]" />
                  <span className="text-xs font-bold text-white">Connect Spotify</span>
                </div>
                <button onClick={() => setIsExpanded(false)} className="text-brand-text-secondary hover:text-white">
                  <Music className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-brand-text-secondary leading-tight">Enter your Spotify Client ID to control music during workouts.</p>
              <input 
                type="text" 
                placeholder="Client ID" 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="bg-[#2A2D3A] border border-brand-border rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#1DB954]"
              />
              <button 
                onClick={handleLogin}
                className="bg-[#1DB954] text-black font-bold text-[11px] py-1.5 rounded-full hover:bg-[#1ed760] transition-colors"
              >
                Login with Spotify
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsExpanded(true)}
              className="w-14 h-14 flex items-center justify-center hover:bg-[#2A2D3A] transition-colors"
              title="Connect Spotify"
            >
              <Music className="w-5 h-5 text-[#1DB954]" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {isExpanded ? (
            <div className="p-3 flex flex-col gap-3">
               <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#1DB954]" />
                  <span className="text-xs font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                    {isPlayerReady ? "Spotify Player" : "Connecting..."}
                  </span>
                </div>
                <button onClick={() => setIsExpanded(false)} className="text-brand-text-secondary hover:text-white">
                  <Music className="w-4 h-4" />
                </button>
              </div>

              {playerState ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <img 
                      src={playerState.track_window.current_track.album.images[0]?.url || ''} 
                      alt="Album Art" 
                      className="w-12 h-12 rounded bg-[#2A2D3A] object-cover"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-white truncate">{playerState.track_window.current_track.name}</span>
                      <span className="text-[10px] text-brand-text-secondary truncate">{playerState.track_window.current_track.artists[0].name}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 mt-1">
                    <button onClick={previousTrack} className="text-brand-text-secondary hover:text-white transition-colors">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={togglePlay} className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                      {playerState.paused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button onClick={nextTrack} className="text-brand-text-secondary hover:text-white transition-colors">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-center py-2">
                  <span className="text-[11px] text-brand-text-secondary">
                    {isPlayerReady ? "Select 'Sport App Web Player' in Spotify" : "Initializing player..."}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsExpanded(true)}
              className="w-14 h-14 flex items-center justify-center hover:bg-[#2A2D3A] transition-colors relative group"
              title="Spotify Controls"
            >
              {playerState && !playerState.paused ? (
                 <div className="absolute inset-0 border-2 border-[#1DB954] rounded-lg animate-pulse" />
              ) : null}
              <Music className="w-5 h-5 text-[#1DB954]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
