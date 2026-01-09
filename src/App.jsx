import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, List, Save, RefreshCw, Edit, MessageCircle, Trash2, Mic } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newTask, setNewTask] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showAddWindow, setShowAddWindow] = useState(false);
  const [showListWindow, setShowListWindow] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [savedLinks, setSavedLinks] = useState([]);
  const [showCustomizePopup, setShowCustomizePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showAiLinksPopup, setShowAiLinksPopup] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [celebrateTask, setCelebrateTask] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isListeningNote, setIsListeningNote] = useState(false);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [draggedTaskIndex, setDraggedTaskIndex] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  
  // Edit task states
  const [editTask, setEditTask] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCustomUrl, setEditCustomUrl] = useState('');
  const [editCustomDescription, setEditCustomDescription] = useState('');

  const swipeHandlers = useSwipeable({
  onSwipedLeft: () => scrollTaskDown(),
  onSwipedRight: () => scrollTaskUp(),
  preventScrollOnSwipe: true,
  trackMouse: true
  });

// Get user's location on component mount
useEffect(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get city/country
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const city = data.address.city || data.address.town || data.address.village || '';
          const country = data.address.country || '';
          
          const location = city ? `${city}, ${country}` : country;
          setUserLocation(location);
          console.log('User location:', location);
        } catch (error) {
          console.error('Error getting location name:', error);
          setUserLocation('Israel'); // fallback
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setUserLocation('Israel'); // fallback if permission denied
      }
    );
  }
}, []);

useEffect(() => {
  const stored = localStorage.getItem('savedLinks');
  if (stored) {
    setSavedLinks(JSON.parse(stored));
  }
}, []);

// Load tasks from localStorage on mount
useEffect(() => {
  const storedTasks = localStorage.getItem('tasks');
  if (storedTasks) {
    try {
      const parsedTasks = JSON.parse(storedTasks);
      setTasks(parsedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }
}, []);

// Save tasks to localStorage whenever they change
useEffect(() => {
  if (tasks.length > 0) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
}, [tasks]);

// Load and check streak on mount
useEffect(() => {
  const savedStreak = localStorage.getItem('streakCount');
  const lastCompleted = localStorage.getItem('lastCompletedDate');
  
  if (savedStreak && lastCompleted) {
    const today = new Date().toDateString();
    const lastDate = new Date(lastCompleted).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // If last completed was today or yesterday, keep streak
    if (lastDate === today || lastDate === yesterday) {
      setStreakCount(parseInt(savedStreak));
    } else {
      // Streak broken - reset to 0
      setStreakCount(0);
      localStorage.setItem('streakCount', '0');
    }
  }
}, []);

// Voice recognition for Hebrew
const startVoiceRecognition = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Voice recognition is not supported in your browser. Please try Chrome or Edge.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.lang = 'he-IL';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let timeoutId;

  recognition.onstart = () => {
    console.log('Voice recognition started');
    setIsListening(true);
    
    // Auto-stop after 5 seconds
    timeoutId = setTimeout(() => {
      recognition.stop();
    }, 5000);
  };

  recognition.onresult = (event) => {
    clearTimeout(timeoutId);
    const transcript = event.results[0][0].transcript;
    console.log('Transcript:', transcript);
    setNewTask(transcript);
    setIsListening(false);
  };

  recognition.onerror = (event) => {
    clearTimeout(timeoutId);
    console.error('Speech recognition error:', event.error);
    setIsListening(false);
    
    if (event.error === 'no-speech') {
      alert('לא זוהה דיבור. אנא נסה שוב.');
    } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
      alert('נדרשת הרשאה למיקרופון.\n\nלחץ על סמל המיקרופון בסרגל הכתובת ואפשר גישה.');
    } else if (event.error === 'network') {
      alert('שגיאת רשת. ודא שיש לך חיבור לאינטרנט.');
    }
  };

  recognition.onend = () => {
    clearTimeout(timeoutId);
    console.log('Voice recognition ended');
    setIsListening(false);
  };

  try {
    recognition.start();
  } catch (error) {
    console.error('Failed to start recognition:', error);
    alert('לא ניתן להפעיל זיהוי קול. אנא בדוק את הגדרות הדפדפן.');
    setIsListening(false);
  }
};

// Voice recognition for notes (Hebrew)
const startNoteVoiceRecognition = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Voice recognition is not supported in your browser. Please try Chrome or Edge.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.lang = 'he-IL';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let timeoutId;

  recognition.onstart = () => {
    console.log('Note voice recognition started');
    setIsListeningNote(true);
    
    // Auto-stop after 5 seconds
    timeoutId = setTimeout(() => {
      recognition.stop();
    }, 5000);
  };

  recognition.onresult = (event) => {
    clearTimeout(timeoutId);
    const transcript = event.results[0][0].transcript;
    console.log('Note transcript:', transcript);
    // Append to existing note with a space if there's already text
    setNewNote(prev => prev ? prev + ' ' + transcript : transcript);
    setIsListeningNote(false);
  };

  recognition.onerror = (event) => {
    clearTimeout(timeoutId);
    console.error('Speech recognition error:', event.error);
    setIsListeningNote(false);
    
    if (event.error === 'no-speech') {
      alert('לא זוהה דיבור. אנא נסה שוב.');
    } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
      alert('נדרשת הרשאה למיקרופון.\n\nלחץ על סמל המיקרופון בסרגל הכתובת ואפשר גישה.');
    } else if (event.error === 'network') {
      alert('שגיאת רשת. ודא שיש לך חיבור לאינטרנט.');
    }
  };

  recognition.onend = () => {
    clearTimeout(timeoutId);
    console.log('Note voice recognition ended');
    setIsListeningNote(false);
  };

  try {
    recognition.start();
  } catch (error) {
    console.error('Failed to start recognition:', error);
    alert('לא ניתן להפעיל זיהוי קול. אנא בדוק את הגדרות הדפדפן.');
    setIsListeningNote(false);
  }
};

  const addTask = async () => {
  if (newTask.trim()) {
    let position = 0; // Default to top
    
    // Only call AI if user explicitly chose "Let AI decide"
    if (newPriority === 'ai') {
      try {
        const response = await fetch('https://task-manager-backend-5wt0.onrender.com/api/prioritize-task', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskTitle: newTask,
            existingTasks: tasks,
            userPriority: null
          }),
        });
        
        const data = await response.json();
        position = data.position - 1;
      } catch (error) {
        console.error('Error getting priority:', error);
        position = 0; // Fallback to top
      }
    } else if (newPriority === 'high' || !newPriority) {
      // High priority or no selection -> top
      position = 0;
    } else if (newPriority === 'medium') {
      // Medium priority -> middle
      position = Math.floor(tasks.length / 2);
    } else if (newPriority === 'low') {
      // Low priority -> bottom
      position = tasks.length;
    }
    
    const newTaskObj = {
      id: Date.now(),
      title: newTask,
      dueDate: newDueDate || null,
      priority: newPriority || 'none',
      note: newNote || null,
      savedLinks: []
    };
    
    // Save quick link if provided
    if (customUrl.trim()) {
      newTaskObj.savedLinks.push({
        id: Date.now(),
        url: customUrl,
        description: customDescription || new URL(customUrl).hostname
      });
    }
    
    const newTasks = [...tasks];
    newTasks.splice(position, 0, newTaskObj);
    setTasks(newTasks);
    
    setNewTask('');
    setNewDueDate('');
    setNewPriority('');
    setNewNote('');
    setCustomUrl('');
    setCustomDescription('');
    setShowAddWindow(false);
  }
};

const prioritizeAllTasks = async () => {
  if (tasks.length === 0) return;
  
  setIsPrioritizing(true);
  
  try {
    const response = await fetch('https://task-manager-backend-5wt0.onrender.com/api/prioritize-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: tasks
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to prioritize tasks');
    }
    
    const data = await response.json();
    setTasks(data.prioritizedTasks);
    setCurrentIndex(0);
    alert('Tasks have been prioritized!');
  } catch (error) {
    console.error('Error prioritizing tasks:', error);
    alert('Failed to prioritize tasks. Please try again.');
  } finally {
    setIsPrioritizing(false);
  }
};

  const scrollTaskUp = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setAiSuggestion('');
    }
  };

  const scrollTaskDown = () => {
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAiSuggestion('');
    }
  };

  const deleteTask = (index) => {
  setCelebrateTask(true);
  
  // Update streak (only when deleting from main task display)
  const today = new Date().toDateString();
  const lastCompleted = localStorage.getItem('lastCompletedDate');
  const lastCompletedDate = lastCompleted ? new Date(lastCompleted).toDateString() : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  let newStreak = 1;
  
  if (lastCompletedDate === today) {
    // Already completed a task today, keep current streak
    newStreak = streakCount;
  } else if (lastCompletedDate === yesterday) {
    // Completed yesterday, increment streak
    newStreak = streakCount + 1;
  } else {
    // Streak broken or first task ever, start at 1
    newStreak = 1;
  }
  
  // Save streak data
  localStorage.setItem('streakCount', newStreak.toString());
  localStorage.setItem('lastCompletedDate', new Date().toISOString());
  setStreakCount(newStreak);
  
  // Check for milestones and show celebration
  if (newStreak === 7) {
    setCelebrationMessage('Week Warrior! 🎉');
    setShowStreakCelebration(true);
    setTimeout(() => setShowStreakCelebration(false), 3000);
  } else if (newStreak === 30) {
    setCelebrationMessage('Month Master! 🏆');
    setShowStreakCelebration(true);
    setTimeout(() => setShowStreakCelebration(false), 3000);
  } else if (newStreak === 100) {
    setCelebrationMessage('Century Superstar! ⭐');
    setShowStreakCelebration(true);
    setTimeout(() => setShowStreakCelebration(false), 3000);
  }
  
  setTimeout(() => {
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    
    // Clear localStorage if no tasks left
    if (newTasks.length === 0) {
      localStorage.removeItem('tasks');
    }
    
    if (currentIndex >= newTasks.length && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    setCelebrateTask(false);
  }, 1200);
  };

  const moveTaskInList = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newTasks = [...tasks];
      [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
      setTasks(newTasks);
      setCurrentIndex(currentIndex === index ? currentIndex - 1 : currentIndex === index - 1 ? currentIndex + 1 : currentIndex);
    } else if (direction === 'down' && index < tasks.length - 1) {
      const newTasks = [...tasks];
      [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
      setTasks(newTasks);
      setCurrentIndex(currentIndex === index ? currentIndex + 1 : currentIndex === index + 1 ? currentIndex - 1 : currentIndex);
    }
  };

const handleDragStart = (index) => {
  setDraggedTaskIndex(index);
};

const handleDragOver = (e) => {
  e.preventDefault(); // Allow drop
};

const handleDrop = (dropIndex) => {
  if (draggedTaskIndex === null || draggedTaskIndex === dropIndex) return;
  
  const newTasks = [...tasks];
  const [draggedTask] = newTasks.splice(draggedTaskIndex, 1);
  newTasks.splice(dropIndex, 0, draggedTask);
  
  setTasks(newTasks);
  
  // Update currentIndex if needed
  if (currentIndex === draggedTaskIndex) {
    setCurrentIndex(dropIndex);
  } else if (draggedTaskIndex < currentIndex && dropIndex >= currentIndex) {
    setCurrentIndex(currentIndex - 1);
  } else if (draggedTaskIndex > currentIndex && dropIndex <= currentIndex) {
    setCurrentIndex(currentIndex + 1);
  }
  
  setDraggedTaskIndex(null);
};

const handleDragEnd = () => {
  setDraggedTaskIndex(null);
};

// Touch handlers for mobile
const handleTouchStart = (e, index) => {
  setDraggedTaskIndex(index);
  setTouchStartY(e.touches[0].clientY);
};

const handleTouchMove = (e) => {
  if (draggedTaskIndex === null || touchStartY === null) return;
  
  e.preventDefault(); // Prevent scrolling while dragging
  
  const touchY = e.touches[0].clientY;
  const target = document.elementFromPoint(e.touches[0].clientX, touchY);
  
  // Remove previous highlights from all numbers
  document.querySelectorAll('[data-task-index] .task-number').forEach(item => {
    item.classList.remove('bg-blue-500', 'text-white', 'scale-125');
  });
  
  // Always highlight the dragged task number (in its original position)
  const draggedElement = document.querySelector(`[data-task-index="${draggedTaskIndex}"] .task-number`);
  if (draggedElement) {
    draggedElement.classList.add('bg-blue-500', 'text-white', 'scale-125');
  }
  
  // Find the task item element under touch
  const taskItem = target?.closest('[data-task-index]');
  if (taskItem) {
    const dropIndex = parseInt(taskItem.getAttribute('data-task-index'));
    if (dropIndex !== draggedTaskIndex) {
      // Also highlight the drop target number
      const numberElement = taskItem.querySelector('.task-number');
      if (numberElement) {
        numberElement.classList.add('bg-blue-500', 'text-white', 'scale-125');
      }
    }
  }
};

const handleTouchEnd = (e) => {
  if (draggedTaskIndex === null) return;
  
  const touchY = e.changedTouches[0].clientY;
  const target = document.elementFromPoint(e.changedTouches[0].clientX, touchY);
  
  // Find the task item element
  const taskItem = target?.closest('[data-task-index]');
  if (taskItem) {
    const dropIndex = parseInt(taskItem.getAttribute('data-task-index'));
    if (dropIndex !== draggedTaskIndex) {
      handleDrop(dropIndex);
    }
  }
  
  setDraggedTaskIndex(null);
  setTouchStartY(null);
  
  // Clean up ALL highlights after drop
  document.querySelectorAll('[data-task-index] .task-number').forEach(item => {
    item.classList.remove('bg-blue-500', 'text-white', 'scale-125');
  });
};

const getAILinks = async () => {
  if (!currentTask) return;
  
  setLoadingSuggestion(true);
  setShowAiLinksPopup(true);
  
  try {
    const response = await fetch('https://task-manager-backend-5wt0.onrender.com/api/get-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskTitle: currentTask.title,
        dueDate: currentTask.dueDate,
        priority: currentTask.priority,
        userLocation: userLocation || 'Israel'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get links');
    }

    const data = await response.json();
    
    if (data.links && data.links.length > 0) {
      setAiSuggestion(JSON.stringify(data.links));
    }
  } catch (error) {
    console.error('Error getting AI links:', error);
    setAiSuggestion('');
  } finally {
    setLoadingSuggestion(false);
  }
};

const handleSaveAiLink = (link) => {
  const newTasks = [...tasks];
  const task = newTasks[currentIndex];
  
  if (!task.savedLinks) {
    task.savedLinks = [];
  }
  
  const newLink = {
    id: Date.now(),
    url: link.url,
    description: link.description
  };
  
  task.savedLinks.push(newLink);
  setTasks(newTasks);
  alert('Link saved to this task!');
};

const handleRemoveSavedLink = (linkId) => {
  const newTasks = [...tasks];
  const task = newTasks[currentIndex];
  
  if (task.savedLinks) {
    task.savedLinks = task.savedLinks.filter(link => link.id !== linkId);
    setTasks(newTasks);
  }
};

const handleCustomizeLink = () => {
  if (!customUrl) {
    alert('Please enter a URL');
    return;
  }
  
  const description = customDescription || new URL(customUrl).hostname;
  
  const newTasks = [...tasks];
  const task = newTasks[currentIndex];
  
  if (!task.savedLinks) {
    task.savedLinks = [];
  }
  
  const newLink = {
    id: Date.now(),
    url: customUrl,
    description: description
  };
  
  task.savedLinks.push(newLink);
  setTasks(newTasks);
  
  setShowCustomizePopup(false);
  setCustomUrl('');
  setCustomDescription('');
  alert('Custom link saved to this task!');
};

const handleRefreshLinks = async () => {
  if (!currentTask) return;
  
  setLoadingSuggestion(true);
  try {
    const response = await fetch('https://task-manager-backend-5wt0.onrender.com/api/get-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskTitle: currentTask.title + ' (provide NEW alternative suggestions)',
        dueDate: currentTask.dueDate,
        priority: currentTask.priority,
        userLocation: userLocation || 'Israel'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get links');
    }

    const data = await response.json();
    
    if (data.links && data.links.length > 0) {
      const newLinks = data.links.slice(0, 2);
      const searchQuery = encodeURIComponent(currentTask.title);
      newLinks.push({
        url: `https://www.google.com/search?q=${searchQuery}`,
        description: 'Search on Google',
        source: 'fallback'
      });
      setAiSuggestion(JSON.stringify(newLinks));
    }
  } catch (error) {
    console.error('Error refreshing links:', error);
  } finally {
    setLoadingSuggestion(false);
  }
};

const handleOpenChat = () => {
  const locationText = userLocation ? ` (I'm in ${userLocation})` : '';
  const query = encodeURIComponent(`${currentTask.title}${locationText}`);
  const perplexityUrl = `https://www.perplexity.ai/?q=${query}`;
  window.open(perplexityUrl, '_blank');
};

const openEditPopup = () => {
  if (!currentTask) return;
  
  setEditTask(currentTask.title);
  setEditDueDate(currentTask.dueDate || '');
  setEditNote(currentTask.note || '');
  setEditCustomUrl('');
  setEditCustomDescription('');
  setShowEditPopup(true);
};

const saveTaskEdit = () => {
  const newTasks = [...tasks];
  const task = newTasks[currentIndex];
  
  task.title = editTask;
  task.dueDate = editDueDate || null;
  task.note = editNote || null;
  
  // Add new link if provided
  if (editCustomUrl.trim()) {
    if (!task.savedLinks) {
      task.savedLinks = [];
    }
    task.savedLinks.push({
      id: Date.now(),
      url: editCustomUrl,
      description: editCustomDescription || new URL(editCustomUrl).hostname
    });
  }
  
  setTasks(newTasks);
  setShowEditPopup(false);
  setEditTask('');
  setEditDueDate('');
  setEditNote('');
  setEditCustomUrl('');
  setEditCustomDescription('');
};

  const currentTask = tasks[currentIndex];
  const priorityColors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Streak Banner - Fixed Top */}
      {streakCount > 0 && (
        <div className={`w-full py-3 px-8 text-center font-bold text-lg shadow-md ${
          streakCount >= 100 
            ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 text-white animate-pulse' 
            : streakCount >= 30 
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            : streakCount >= 7 
            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
            : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
        }`}>
          🔥 {streakCount} Day Streak!
        </div>
      )}
      
      {/* Celebration Overlay */}
      {showStreakCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl p-8 animate-bounce">
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              {celebrationMessage}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Flexible Space */}
      <div className="flex-1 flex items-center justify-center px-8 py-4 overflow-hidden">
        <div className="max-w-2xl w-full h-full flex flex-col">

        {tasks.length > 0 ? (
          <div {...swipeHandlers} className="bg-white rounded-lg shadow-md p-8 pt-16 relative flex-1 flex flex-col justify-around overflow-y-auto">
            <div className="absolute top-6 left-6">
              <p className="text-3xl font-bold text-slate-900">{currentIndex + 1}</p>
            </div>
            <div className="absolute top-6 right-6 flex gap-2">
              <button
                onClick={openEditPopup}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Edit
              </button>
              <button
                onClick={() => deleteTask(currentIndex)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                disabled={celebrateTask}
              >
                Done
                {celebrateTask && (
                  <>
                    <span className="sparkle" style={{ top: '-10px', left: '10px', animationDelay: '0s' }}>✨</span>
                    <span className="sparkle" style={{ top: '5px', right: '5px', animationDelay: '0.2s' }}>⭐</span>
                    <span className="sparkle" style={{ bottom: '0px', left: '15px', animationDelay: '0.4s' }}>✨</span>
                    <span className="sparkle" style={{ top: '-5px', right: '15px', animationDelay: '0.6s' }}>⭐</span>
                 </>
                )}
              </button>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center mt-4">{currentTask.title}</h2>
            {currentTask.dueDate && (
              <p className="text-slate-600 text-center mb-2">Due: {new Date(currentTask.dueDate).toLocaleDateString()}</p>
            )}
            {currentTask.note && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
                <p className="text-slate-700 whitespace-pre-wrap">{currentTask.note}</p>
              </div>
            )}
            
            {/* Saved Links Section */}
            {currentTask.savedLinks && currentTask.savedLinks.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-700 mb-2">Saved Links:</p>
                <div className="space-y-2">
                  {currentTask.savedLinks.map((link) => {
                    const hasHebrew = /[\u0590-\u05FF]/.test(link.description);
                    return (
                      <div key={link.id} className="flex items-center gap-2">
                        <a 
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 block bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium py-2 px-4 rounded-lg border border-blue-300 transition ${hasHebrew ? 'text-right' : ''}`}
                          style={hasHebrew ? { direction: 'rtl' } : {}}
                        >
                          {link.description}
                        </a>
                        <button
                          onClick={() => handleRemoveSavedLink(link.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Remove saved link"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="text-center">
                <button
                  onClick={getAILinks}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  Quick Links
                </button>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => setShowCustomizePopup(true)}
                className="text-slate-600 hover:text-slate-800 text-sm underline"
              >
                + Add custom link
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center flex-1 flex items-center justify-center">
            <p className="text-slate-500 text-lg">No tasks yet. Add one to get started!</p>
          </div>
        )}
        </div>
      </div>

      {/* Bottom Buttons - Fixed */}
      <div className="w-full py-6 pb-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setShowAddWindow(!showAddWindow)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg flex items-center gap-2 transition text-lg shadow-lg"
          >
            <Plus size={24} />
          </button>
          <button
            onClick={() => setShowListWindow(!showListWindow)}
            className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-8 rounded-lg flex items-center gap-2 transition text-lg shadow-lg"
          >
            <List size={24} />
          </button>
        </div>
      </div>

        {/* Add Task Window */}
        {showAddWindow && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-slate-900">New Task</h2>
        <div className="flex gap-2">
          <button
            onClick={addTask}
            disabled={!newTask.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowAddWindow(false);
              setNewTask('');
              setNewDueDate('');
              setNewPriority('');
              setNewNote('');
              setCustomUrl('');
              setCustomDescription('');
            }}
            className="text-slate-500 hover:text-slate-700 p-2 rounded transition"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Task description"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && newTask.trim() && addTask()}
            className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={startVoiceRecognition}
            disabled={isListening}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title="הקלט קולי"
          >
            <Mic size={20} />
          </button>
        </div>
        {isListening && (
          <p className="text-sm text-red-600 text-center">מאזין...</p>
        )}
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          placeholder="Date due (optional)"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
        >
          <option value="">Choose priority (optional)</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
          <option value="ai">Let AI decide priority</option>
        </select>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
          <div className="relative">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add any notes or details about this task..."
              className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
            />
            <button
              onClick={startNoteVoiceRecognition}
              disabled={isListeningNote}
              className={`absolute right-2 top-2 p-2 rounded-full transition ${
                isListeningNote 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="הקלט קולי"
            >
              <Mic size={18} />
            </button>
          </div>
          {isListeningNote && (
            <p className="text-sm text-red-600 mt-1">מאזין...</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Quick Link (optional)</label>
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {customUrl && (
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Link description (optional)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
            />
          )}
          <p className="text-xs text-slate-500 mt-1">Add a helpful link for this task</p>
        </div>
      </div>
    </div>
  </div>
)}

{/* Edit Task Popup */}
{showEditPopup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-semibold text-slate-900 mb-4">Edit Task</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Task Name</label>
          <input
            type="text"
            placeholder="Task description"
            value={editTask}
            onChange={(e) => setEditTask(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
          <input
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Add any notes or details about this task..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
          />
        </div>
        
        {/* Current Saved Links */}
        {currentTask.savedLinks && currentTask.savedLinks.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Current Links</label>
            <div className="space-y-2">
              {currentTask.savedLinks.map((link) => (
                <div key={link.id} className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 text-slate-700 py-2 px-3 rounded border border-slate-200 text-sm truncate">
                    {link.description}
                  </div>
                  <button
                    onClick={() => handleRemoveSavedLink(link.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                    title="Remove link"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Add New Link */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Add New Link (optional)</label>
          <input
            type="url"
            value={editCustomUrl}
            onChange={(e) => setEditCustomUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {editCustomUrl && (
            <input
              type="text"
              value={editCustomDescription}
              onChange={(e) => setEditCustomDescription(e.target.value)}
              placeholder="Link description (optional)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
            />
          )}
        </div>
        
        <div className="flex gap-3 pt-2">
          <button
            onClick={saveTaskEdit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Save Changes
          </button>
          <button
            onClick={() => {
              setShowEditPopup(false);
              setEditTask('');
              setEditDueDate('');
              setEditNote('');
              setEditCustomUrl('');
              setEditCustomDescription('');
            }}
            className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold py-2 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Custom Link Popup */}
{showCustomizePopup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <h2 className="text-2xl font-semibold text-slate-900 mb-4">Add Custom Link</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">URL *</label>
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
          <input
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Leave empty to use website name"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCustomizeLink}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Save
          </button>
          <button
            onClick={() => {
              setShowCustomizePopup(false);
              setCustomUrl('');
              setCustomDescription('');
            }}
            className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold py-2 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* AI Links Popup */}
{showAiLinksPopup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-slate-900">Quick Links</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshLinks}
            className="p-2 text-purple-600 hover:bg-purple-100 rounded transition"
            title="Get new suggestions"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleOpenChat}
            className="p-2 text-purple-600 hover:bg-purple-100 rounded transition"
            title="Chat with AI about this task"
          >
            <MessageCircle size={20} />
          </button>
          <button
            onClick={() => {
              setShowAiLinksPopup(false);
              setAiSuggestion('');
            }}
            className="text-slate-500 hover:text-slate-700 p-2 rounded transition"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      
      {loadingSuggestion ? (
        <div className="flex items-center justify-center gap-2 text-slate-600 py-8">
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Finding helpful links...</span>
        </div>
      ) : aiSuggestion ? (
        <div className="space-y-2">
          {JSON.parse(aiSuggestion).map((link, idx) => {
            const hasHebrew = /[\u0590-\u05FF]/.test(link.description);
            
            return (
              <div key={idx} className="flex items-center gap-2">
                <a 
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 block bg-purple-50 hover:bg-purple-100 text-purple-800 font-medium py-3 px-4 rounded-lg border border-purple-300 transition ${hasHebrew ? 'text-right' : ''}`}
                  style={hasHebrew ? { direction: 'rtl' } : {}}
                >
                  {link.description}
                </a>
                <button
                  onClick={() => handleSaveAiLink(link)}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                  title="Save this link to task"
                >
                  <Save size={18} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-500 text-center py-8">No suggestions available</p>
      )}
    </div>
  </div>
)}

{/* Task List Window */}
{showListWindow && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col relative">
      <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">All Tasks</h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={prioritizeAllTasks}
            disabled={isPrioritizing || tasks.length === 0}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition text-sm flex items-center gap-2"
          >
            {isPrioritizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Prioritizing...</span>
              </>
            ) : (
              'Prioritize'
            )}
          </button>
          <button
            onClick={() => setShowListWindow(false)}
            className="text-slate-500 hover:text-slate-700 p-1 rounded transition"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto p-6 pt-4 flex-1">
        {tasks.length > 0 ? (
          <div className="space-y-2 mb-4">
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                data-task-index={idx}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleDragStart(idx);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDragOver(e);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDrop(idx);
                }}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, idx)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`p-3 rounded-lg transition flex items-center gap-3 cursor-move touch-none ${
                  draggedTaskIndex === idx
                    ? 'opacity-30 bg-slate-400 border-2 border-slate-500 scale-95'
                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div
                  onClick={() => {
                    if (draggedTaskIndex === null) {
                      setCurrentIndex(idx);
                      setShowListWindow(false);
                    }
                  }}
                  className="flex-1 min-w-0 cursor-pointer flex items-center gap-3"
                >
                  <span className="task-number font-bold text-slate-600 transition-all duration-200 rounded px-2 py-1">
                   {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{task.title}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(idx);
                  }}
                  className="p-1 text-red-600 hover:bg-red-100 rounded transition flex-shrink-0"
                  title="Delete task"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 mb-4">No tasks yet.</p>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
}
