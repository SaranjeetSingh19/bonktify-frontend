import React, { useEffect, useState, useRef } from 'react'
import { Music, User, Plus, ThumbsUp, Trash2, ThumbsDown, LogOut } from 'lucide-react'
import axios from 'axios'
import { Link } from 'react-router-dom'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

interface Song {
  id: number
  url: string
  title: string
  thumbnail: string
  priority: number
  userId: number
}

export default function Home() {
  const token = localStorage.getItem('token')
  const apiUrl = import.meta.env.VITE_API_URL;
  
  const [songs, setSongs] = useState<Song[]>([])
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0)
  const [currentVideoId, setCurrentVideoId] = useState<string>('')
  
  const [inputUrl, setInputUrl] = useState<string>('')
  const [previewId, setPreviewId] = useState<string>('')
  const [previewTitle, setPreviewTitle] = useState<string>('')
  const [previewThumbnail, setPreviewThumbnail] = useState<string>('')
  const [showPreview, setShowPreview] = useState<boolean>(false)
  
  // Reference to the YT player instance
  const playerRef = useRef<any>(null)

  // Extract YouTube video ID from a URL
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  // Fetch songs from backend
  const fetchSongs = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/songs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const fetchedSongs: Song[] = response.data
      setSongs(fetchedSongs)
      
      // If we have songs, assume index 0 is the current one
      if (fetchedSongs.length > 0) {
        setCurrentSongIndex(0)
        const firstVideoId = extractVideoId(fetchedSongs[0].url) || ''
        setCurrentVideoId(firstVideoId)
      } else {
        setCurrentVideoId('')
      }
    } catch (error) {
      console.error(error)
    }
  }

  // Initialize / update the player whenever currentVideoId changes
  useEffect(() => {
    loadYouTubePlayer()
  }, [currentVideoId])

  // Load songs once on mount
  useEffect(() => {
    fetchSongs()
  }, [])

  // Dynamically load the YouTube IFrame script (if not already loaded),
  // then create or re-create the player
  const loadYouTubePlayer = () => {
    if (!currentVideoId) {
      // No current video, just destroy any old player
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
      return
    }

    if (window.YT && typeof window.YT.Player === 'function') {
      createPlayer()
    } else {
      // Load script if not loaded
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
      window.onYouTubeIframeAPIReady = () => {
        createPlayer()
      }
    }
  }

  // Create or re-create the YT Player
  const createPlayer = () => {
    // Destroy old player if exists
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    // Create a new player in the #player div
    playerRef.current = new window.YT.Player('player', {
      videoId: currentVideoId,
      playerVars: {
        autoplay: 1,
        enablejsapi: 1,
      },
      events: {
        onStateChange: onPlayerStateChange,
      },
    })
  }

  // Called whenever the player state changes (e.g., ended, paused, etc.)
  const onPlayerStateChange = (event: any) => {
    // 0 = ended
    if (event.data === window.YT.PlayerState.ENDED) {
      playNextSong()
    }
  }

  // Move to the next song in the list (without removing from queue)
  const playNextSong = () => {
    if (songs.length > 0 && currentSongIndex < songs.length - 1) {
      const newIndex = currentSongIndex + 1
      setCurrentSongIndex(newIndex)
      const nextId = extractVideoId(songs[newIndex].url) || ''
      setCurrentVideoId(nextId)
    }
  }

  // Skip button calls this
  const handleSkip = () => {
    playNextSong()
  }

  // Handle input change for adding a new song
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputUrl(e.target.value)
    const videoId = extractVideoId(e.target.value)
    if (videoId) {
      setPreviewId(videoId)
      setPreviewTitle("Video Preview")
      setPreviewThumbnail(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
      setShowPreview(true)
    } else {
      setShowPreview(false)
    }
  }

  // Add a new song to the queue
  const handleAddToQueue = async () => {
    if (previewId) {
      try {
        await axios.post(
          `${apiUrl}/api/songs`,
          { url: inputUrl, priority: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        fetchSongs()
        setInputUrl('')
        setShowPreview(false)
      } catch (error) {
        console.error(error)
      }
    }
  }

  // Upvote or downvote
  const handleVote = async (song: Song, increment: boolean) => {
    try {
      const newPriority = song.priority + (increment ? 1 : -1)
      await axios.patch(
        `${apiUrl}/api/songs/${song.id}`,
        { priority: newPriority },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchSongs()
    } catch (error) {
      console.error(error)
    }
  }

  // The logic that simulates removing the *current* song from the queue is commented out
  // Instead, we just delete it from the DB if you want that behavior
  const handleDeleteCurrentSong = async () => {
    if (songs.length > 0) {
      try {
        const currentSong = songs[currentSongIndex]
        await axios.delete(`${apiUrl}/api/songs/${currentSong.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        fetchSongs()
      } catch (error) {
        console.error(error)
      }
    }
  }

  // Delete any song from the queue (dustbin icon)
  const handleDeleteSong = async (song: Song) => {
    try {
      await axios.delete(`${apiUrl}/api/songs/${song.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchSongs()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-7">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Bonktify</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* <User className="h-5 w-5" />
            <span>Viewer Mode</span> */}
            <Link to="/login" className="text-blue-500 ml-4"><LogOut className='w-5 h-5 text-white'/></Link>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Main content: Current video + input */}
          <div className="space-y-6">
            {/* Now Playing */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Now Playing</h2>

              {/* Aspect-video container for 16:9 ratio */}
              <div className="aspect-video overflow-hidden rounded-lg bg-zinc-900 relative">
                {/* The div that the YouTube IFrame API will replace */}
                {currentVideoId ? (
                  <div id="player" className="absolute top-0 left-0 w-full h-full" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <p>No song playing</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {songs[currentSongIndex]?.title || "No song playing"}
                  </p>
                  <p className="text-sm text-gray-400">
                    Requested by: {songs[currentSongIndex]?.userId || "Unknown"}
                  </p>
                </div>
                <button
                  className="border border-white hover:bg-white/10 px-4 py-2 rounded"
                  onClick={handleSkip}
                >
                  Skip
                </button>
              </div>
            </div>

            {/* Video submission */}
            <div className="space-y-4 rounded-lg border border-zinc-800 p-6">
              <h2 className="text-xl font-semibold">Add a Song to the Queue</h2>
              <div className="flex gap-2">
                <input
                  className="border-zinc-700 bg-zinc-900 text-white placeholder:text-gray-500 p-3 rounded w-full"
                  placeholder="Paste YouTube URL here"
                  value={inputUrl}
                  onChange={handleInputChange}
                />
                <button
                  className="bg-white text-black hover:bg-gray-200 px-4 py-3 rounded flex items-center gap-1"
                  onClick={handleAddToQueue}
                  disabled={!showPreview}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {/* Video preview */}
              {showPreview && (
                <div className="mt-4 flex gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="h-24 w-40 flex-shrink-0 overflow-hidden rounded">
                    <img
                      src={previewThumbnail || "/placeholder.svg"}
                      alt="Video thumbnail"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col justify-between">
                    <div>
                      <h3 className="font-medium">{previewTitle}</h3>
                      <p className="text-sm text-gray-400">
                        Click Add to submit this video to the queue
                      </p>
                    </div>
                    <button
                      className="mt-2 w-full bg-white text-black hover:bg-gray-200 px-4 py-2 rounded"
                      onClick={handleAddToQueue}
                    >
                      Add to Queue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Queue */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
            <h2 className="mb-4 text-xl font-semibold">Up Next</h2>
            <div className="space-y-4">
              {songs.length > 0 ? (
                songs.map((song, index) => (
                  <div
                    key={song.id}
                    className={`flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 ${
                      index === currentSongIndex ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded">
                      <img
                        src={song.thumbnail || "/placeholder.svg"}
                        alt={song.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="line-clamp-2 text-sm font-medium">{song.title}</h3>
                        <p className="text-xs text-gray-400">Added by: {song.userId}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{song.priority} votes</span>
                        <div className="flex gap-1">
                          {/* Upvote */}
                          <button
                            className="h-8 w-8 rounded-full p-0 hover:bg-white/10 flex items-center justify-center"
                            onClick={() => handleVote(song, true)}
                          >
                            <ThumbsUp className="h-4 w-4" />
                            <span className="sr-only">Upvote</span>
                          </button>
                          {/* (Optional) Downvote */}
                          {/* <button
                            className="h-8 w-8 rounded-full p-0 hover:bg-white/10 flex items-center justify-center"
                            onClick={() => handleVote(song, false)}
                          >
                            <ThumbsDown className="h-4 w-4" />
                            <span className="sr-only">Downvote</span>
                          </button> */}
                          {/* Dustbin: Delete any song */}
                          <button
                            className="h-8 w-8 rounded-full p-0 hover:bg-white/10 flex items-center justify-center"
                            onClick={() => handleDeleteSong(song)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
                  <p className="text-gray-400">The queue is empty. Add some songs!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
