import { useEffect, useState } from 'react';
import { spacesAPI, reservationsAPI, messagesAPI } from '../../utils/api';
import { MapPin, Star, Coins, Clock, X, Calendar, Navigation, Locate, AlertCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Space {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  rating: number;
  imageUrl?: string;
  images?: string[];
  managerId?: string;
  type?: string;
}

// Custom high-fidelity marker icons to avoid Vite assets resolution bugs
const spaceIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to dynamically re-center map view
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

const formatDatetimeLocal = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

export function MapPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    hours: 1,
  });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [selectedSpaceReviews, setSelectedSpaceReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'silencieux' | 'collaboratif'>('all');
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const handleStartDateChange = (val: string) => {
    setBookingError(null);
    if (!val) {
      setBookingData({ ...bookingData, startDate: val, endDate: '' });
      return;
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      d.setHours(d.getHours() + bookingData.hours);
      setBookingData({
        ...bookingData,
        startDate: val,
        endDate: formatDatetimeLocal(d)
      });
    } else {
      setBookingData({ ...bookingData, startDate: val });
    }
  };

  const handleHoursChange = (hoursVal: number) => {
    setBookingError(null);
    const hrs = hoursVal || 1;
    if (bookingData.startDate) {
      const d = new Date(bookingData.startDate);
      if (!isNaN(d.getTime())) {
        d.setHours(d.getHours() + hrs);
        setBookingData({
          ...bookingData,
          hours: hrs,
          endDate: formatDatetimeLocal(d)
        });
        return;
      }
    }
    setBookingData({ ...bookingData, hours: hrs });
  };

  const openBookingModal = () => {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    const startStr = formatDatetimeLocal(now);
    
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    const endStr = formatDatetimeLocal(end);

    setBookingData({
      startDate: startStr,
      endDate: endStr,
      hours: 1
    });
    setBookingError(null);
    setShowBookingModal(true);
  };

  // Coordinates states
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.8065, 10.1815]); // Fallback: Tunis

  useEffect(() => {
    if (user && user.role !== 'user') {
      navigate('/dashboard/overview', { replace: true });
      return;
    }
    if (token) {
      loadSpaces();
    }
    requestUserLocation();
  }, [user, token, navigate]);

  useEffect(() => {
    if (selectedSpace && token) {
      loadSpaceReviews(selectedSpace.id);
    } else {
      setSelectedSpaceReviews([]);
    }
  }, [selectedSpace, token]);

  const loadSpaceReviews = async (spaceId: string) => {
    try {
      setIsLoadingReviews(true);
      const { reservations } = await reservationsAPI.getForSpace(spaceId, token);
      
      // Filter reservations that belong to this space, are completed and have written comments
      const reviews = reservations.filter((r: any) => {
        if (r.spaceId !== spaceId) return false;
        const comment = r.comment || localStorage.getItem(`comment_res_${r.id}`);
        return comment && comment.trim().length > 0;
      }).map((r: any) => {
        return {
          id: r.id,
          userName: r.userName || 'Anonymous user',
          rating: r.rating || localStorage.getItem(`rated_res_${r.id}`),
          comment: r.comment || localStorage.getItem(`comment_res_${r.id}`),
          date: r.endDate || r.createdAt
        };
      });
      setSelectedSpaceReviews(reviews);
    } catch (error) {
      console.error('Failed to load space reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation([lat, lng]);
          setMapCenter([lat, lng]);
        },
        (error) => {
          console.warn("Geolocation permission or retrieval error:", error);
        }
      );
    }
  };

  const loadSpaces = async () => {
    try {
      const data = await spacesAPI.getAll(token || undefined);
      setSpaces(data.spaces);

      // If spaces are loaded and user location is not yet ready, center on first space
      if (data.spaces && data.spaces.length > 0 && !userLocation) {
        const first = data.spaces[0];
        if (first.lat && first.lng) {
          setMapCenter([first.lat, first.lng]);
        }
      }
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedSpace || !token) return;

    try {
      setBookingError(null);

      // Fetch all reservations for this space to detect overlaps
      const { reservations } = await reservationsAPI.getForSpace(selectedSpace.id, token);

      const reqStart = new Date(bookingData.startDate).getTime();
      const reqEnd = new Date(bookingData.endDate).getTime();

      if (isNaN(reqStart) || isNaN(reqEnd)) {
        setBookingError("Please select valid start and end dates.");
        return;
      }

      if (reqStart >= reqEnd) {
        setBookingError("The start date must be before the end date.");
        return;
      }

      const isOccupied = reservations.some((res: any) => {
        if (res.spaceId !== selectedSpace.id) return false;
        // Ignore completed or cancelled bookings
        if (res.status === 'completed' || res.status === 'terminée' || res.status === 'cancelled' || res.status === 'annulée') {
          return false;
        }
        const resStart = new Date(res.startDate).getTime();
        const resEnd = new Date(res.endDate).getTime();
        return reqStart < resEnd && reqEnd > resStart;
      });

      if (isOccupied) {
        setBookingError("This space is already reserved by another coworker for this timeslot. Please choose another time.");
        return;
      }

      const totalPrice = selectedSpace.pricePerHour * bookingData.hours;

      await reservationsAPI.create(token, {
        spaceId: selectedSpace.id,
        spaceName: selectedSpace.name,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        hours: bookingData.hours,
        totalPrice,
      });

      // Dispatch booking notification to the manager
      if (selectedSpace.managerId) {
        try {
          await messagesAPI.sendMessage(
            token,
            String(selectedSpace.managerId),
            `[Notification] New Booking | Coworker ${user?.name || 'anonymous'} has booked your space "${selectedSpace.name}" for ${new Date(bookingData.startDate).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.`
          );
        } catch (err) {
          console.error('Failed to send booking notification to manager:', err);
        }
      }

      alert('Booking created successfully!');
      setShowBookingModal(false);
      navigate('/dashboard/reservations');
    } catch (error: any) {
      setBookingError(error.message || 'Error during booking');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] lg:h-[calc(100vh-73px)] flex flex-col bg-slate-950 text-slate-100">
      <div className="p-5 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Spaces Map</h1>
          <p className="text-slate-400 mt-1 text-sm">Visualize spaces and find routes in real-time</p>
        </div>

        {/* Modern Glassmorphic Pill Filters for Space Type */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-300 ${
              selectedTypeFilter === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All spaces
          </button>
          <button
            onClick={() => setSelectedTypeFilter('silencieux')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-300 flex items-center gap-1.5 ${
              selectedTypeFilter === 'silencieux'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🤫 Silent
          </button>
          <button
            onClick={() => setSelectedTypeFilter('collaboratif')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-300 flex items-center gap-1.5 ${
              selectedTypeFilter === 'collaboratif'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-[0_4px_12px_rgba(13,148,136,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🤝 Collaborative
          </button>
        </div>

        {navigator.geolocation && (
          <button
            onClick={requestUserLocation}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-xs self-end sm:self-auto"
          >
            <Locate className="w-4 h-4" />
            My Location
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Leaflet Map container */}
        <div className="flex-1 h-full z-10">
          <MapContainer center={mapCenter} zoom={13} className="w-full h-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeView center={mapCenter} />

            {/* User GPS location Marker */}
            {userLocation && (
              <Marker position={userLocation} icon={userIcon}>
                <Popup>
                  <div className="p-1 text-center">
                    <div className="font-bold text-red-600">📍 Your current location</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Lat: {userLocation[0].toFixed(5)} / Lng: {userLocation[1].toFixed(5)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Coworking spaces Markers */}
            {spaces
              .filter(space => {
                if (selectedTypeFilter === 'all') return true;
                return (space.type || 'collaboratif') === selectedTypeFilter;
              })
              .map((space) => {
                if (!space.lat || !space.lng) return null;
                return (
                <Marker
                  key={space.id}
                  position={[space.lat, space.lng]}
                  icon={spaceIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedSpace(space);
                    },
                  }}
                >
                  <Popup>
                    <div className="p-1 max-w-[200px]">
                      <div className="font-bold text-gray-800 text-sm leading-tight">{space.name}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-snug">{space.address}</div>
                      <div className="flex items-center gap-1 text-blue-600 font-bold text-xs mt-1.5 mb-2.5">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        {space.pricePerHour} DT / h
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${space.lat},${space.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-2 rounded text-xs transition-colors shadow-sm"
                      >
                        <Navigation className="w-3 h-3" />
                        Google Maps Route
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Space details sidebar */}
        <AnimatePresence>
          {selectedSpace && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l overflow-auto shadow-2xl z-20 flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-2xl font-bold text-gray-800 leading-snug">{selectedSpace.name}</h2>
                  <button
                    onClick={() => setSelectedSpace(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Space Type Badge */}
                <div className="mb-4">
                  {selectedSpace.type === 'silencieux' ? (
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm">
                      🤫 Silent
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-teal-100 shadow-sm">
                      🤝 Collaborative
                    </span>
                  )}
                </div>

                {/* Image Slider */}
                {(() => {
                  const spaceImages = selectedSpace.images && selectedSpace.images.length > 0
                    ? selectedSpace.images
                    : selectedSpace.imageUrl
                      ? [selectedSpace.imageUrl]
                      : [];

                  if (spaceImages.length > 0) {
                    return <ImageSlider images={spaceImages} spaceName={selectedSpace.name} />;
                  }

                  return (
                    <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl mb-6 flex items-center justify-center">
                      <MapPin className="w-20 h-20 text-white" />
                    </div>
                  );
                })()}

                <div className="space-y-4 mb-6">
                  {/* Google Maps Route Button */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedSpace.lat},${selectedSpace.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    <Navigation className="w-4 h-4" />
                    Open in Google Maps
                  </a>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Address</h3>
                    <p className="text-gray-800 flex items-start gap-2 text-sm leading-relaxed">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                      {selectedSpace.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Capacity</h3>
                      <p className="text-gray-800 font-semibold text-sm">{selectedSpace.capacity} people</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Rate</h3>
                      <p className="text-lg font-bold text-blue-600">
                        {selectedSpace.pricePerHour} DT / h
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSpace.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 p-2.5 rounded-lg border border-yellow-100 w-fit">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-bold">{selectedSpace.rating} / 5</span>
                  </div>

                  {/* Reviews Section */}
                  <div className="border-t border-slate-100 pt-4 mt-4 text-slate-800">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      Reviews on comfort & environment
                    </h3>
                    
                    {isLoadingReviews ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : selectedSpaceReviews.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        No reviews yet. Be the first to rate this space!
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {selectedSpaceReviews.map((review) => (
                          <div key={review.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800">{review.userName}</span>
                              <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-lg text-[10px] font-black border border-amber-200">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {review.rating}
                              </div>
                            </div>
                            {review.comment ? (
                              <p className="text-xs text-slate-700 font-bold italic leading-relaxed">
                                "{review.comment}"
                              </p>
                            ) : (
                              <p className="text-xs text-slate-450 italic font-bold">No written comment</p>
                            )}
                            <span className="text-[9px] text-slate-400 block text-right font-bold">
                              {new Date(review.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedSpace.managerId && String(selectedSpace.managerId) !== String(user?.id) && (
                  <button
                    onClick={() => navigate(`/dashboard/chat?managerId=${selectedSpace.managerId}`)}
                    className="w-full mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contact Manager
                  </button>
                )}

                <button
                  onClick={openBookingModal}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  Book this space
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Booking modal */}
      <AnimatePresence>
        {showBookingModal && selectedSpace && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-7 max-w-md w-full shadow-[0_25px_60px_rgba(0,0,0,0.15)] text-slate-900 border-2 border-slate-200/80"
            >
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-2xl font-black text-slate-900">Book Space</h3>
                <button
                  onClick={() => {
                    setBookingError(null);
                    setShowBookingModal(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bookingError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900"
                >
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-sm mb-0.5 text-rose-950">
                      {bookingError.includes("reserved") ? "Space already reserved" : "Invalid booking details"}
                    </p>
                    <p className="text-xs text-rose-800 leading-relaxed font-bold">{bookingError}</p>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4.5 mb-6">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={bookingData.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-bold text-slate-900 placeholder-slate-450"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5 flex justify-between">
                    <span>End Date</span>
                    <span className="text-[10px] text-indigo-600 font-extrabold normal-case">(Calculated automatically)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={bookingData.endDate}
                    readOnly
                    disabled
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Number of Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bookingData.hours}
                    onChange={(e) => handleHoursChange(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-bold text-slate-900 placeholder-slate-450"
                  />
                </div>

                <div className="bg-indigo-50/50 p-4.5 rounded-2xl border-2 border-indigo-100">
                  <div className="flex items-center justify-between text-lg font-extrabold text-slate-900">
                    <span>Total :</span>
                    <span className="text-xl font-black text-indigo-700">
                      {selectedSpace.pricePerHour * bookingData.hours} DT
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBooking}
                disabled={!bookingData.startDate || !bookingData.endDate}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:brightness-105 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                <Calendar className="w-5 h-5 text-white" />
                Confirm booking
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImageSlider({ images, spaceName }: { images: string[], spaceName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative h-56 w-full rounded-xl overflow-hidden mb-6 group shadow-md bg-slate-950 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`${spaceName} ${currentIndex + 1}`}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as any).onerror = null;
            (e.target as any).src = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';
          }}
        />
      </AnimatePresence>
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 font-bold z-10"
          >
            &#10094;
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 font-bold z-10"
          >
            &#10095;
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-medium z-10">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
