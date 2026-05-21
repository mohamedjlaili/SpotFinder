import { useEffect, useState } from 'react';
import { reservationsAPI, spacesAPI, messagesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, MapPin, Clock, Coins, Trash2, Edit, X, ShieldAlert, Star, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Reservation {
  id: string;
  spaceId: string;
  spaceName: string;
  startDate: string;
  endDate: string;
  hours: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userId?: string;
  rating?: number;
  comment?: string;
}

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reservationToDeleteId, setReservationToDeleteId] = useState<string | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [editData, setEditData] = useState({
    startDate: '',
    endDate: '',
    hours: 1,
  });
  
  // Rating states
  const [ratingModalReservation, setRatingModalReservation] = useState<Reservation | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedComment, setSelectedComment] = useState<string>('');

  const { token, user } = useAuth();

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      if (!token) return;
      const data = await reservationsAPI.getAll(token);
      // Filter out reservations that the manager has dismissed
      const dismissed: string[] = JSON.parse(localStorage.getItem('dismissed_reservations') || '[]');
      const filtered = data.reservations.filter((r: Reservation) => !dismissed.includes(r.id));
      setReservations(filtered);
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    if (!token) return;
    try {
      await reservationsAPI.update(token, id, { status: 'confirmed' });
      
      const reservation = reservations.find((r) => r.id === id);
      if (reservation && reservation.userId) {
        try {
          await messagesAPI.sendMessage(
            token,
            String(reservation.userId),
            `[Notification] Booking Confirmed | Your booking for space "${reservation.spaceName}" (scheduled on ${new Date(reservation.startDate).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}) has been confirmed by the manager.`
          );
        } catch (err) {
          console.error('Failed to notify user about reservation confirmation:', err);
        }
      }

      alert('Booking confirmed successfully!');
      await loadReservations();
    } catch (error: any) {
      alert(error.message || 'Error during confirmation');
    }
  };

  const handleComplete = async (id: string) => {
    if (!token) return;
    try {
      await reservationsAPI.update(token, id, { status: 'completed' });
      
      const reservation = reservations.find((r) => r.id === id);
      if (reservation && reservation.userId) {
        try {
          await messagesAPI.sendMessage(
            token,
            String(reservation.userId),
            `[Notification] Booking Completed | Your session for space "${reservation.spaceName}" is now complete. You can leave a review on the quality of your session.`
          );
        } catch (err) {
          console.error('Failed to notify user about reservation completion:', err);
        }
      }

      alert('Booking marked as completed! The coworker will receive a request for evaluation.');
      await loadReservations();
    } catch (error: any) {
      alert(error.message || 'Error during closure');
    }
  };

  const submitRating = async (reservation: Reservation, ratingVal: number, commentVal: string) => {
    if (!token) return;
    try {
      // 1. Save the rating to the reservation
      await reservationsAPI.update(token, reservation.id, { rating: ratingVal, comment: commentVal });
      localStorage.setItem(`rated_res_${reservation.id}`, ratingVal.toString());
      if (commentVal.trim()) {
        localStorage.setItem(`comment_res_${reservation.id}`, commentVal);
      }

      // 2. Fetch all reservations for this specific space
      const { reservations: spaceReservations } = await reservationsAPI.getForSpace(reservation.spaceId, token);

      // 3. Compute new average rating
      let sum = ratingVal;
      let count = 1;

      spaceReservations.forEach((r: any) => {
        // Skip current
        if (r.id === reservation.id) return;

        const ratingStr = r.rating || localStorage.getItem(`rated_res_${r.id}`);
        if (ratingStr) {
          const val = parseInt(ratingStr);
          if (val >= 1 && val <= 5) {
            sum += val;
            count++;
          }
        }
      });

      const newAverage = Number((sum / count).toFixed(1));

      // 4. Update the space in the backend
      await spacesAPI.update(token, reservation.spaceId, { rating: newAverage });

      alert(`Thank you for your rating! The space average has been updated to ${newAverage}/5 ⭐`);
      setRatingModalReservation(null);
      setSelectedComment('');
      await loadReservations();
    } catch (error: any) {
      alert(error.message || "Error during rating submission");
    }
  };

  const handleDelete = (id: string) => {
    setReservationToDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!token || !reservationToDeleteId) return;
    const id = reservationToDeleteId;
    const reservation = reservations.find((r) => r.id === id);
    if (!reservation) return;

    try {
      // Send cancellation notification
      try {
        if (user?.role === 'manager' || user?.role === 'admin') {
          if (reservation.userId) {
            await messagesAPI.sendMessage(
              token,
              String(reservation.userId),
              `[Notification] Booking Canceled | The manager has canceled your booking for space "${reservation.spaceName}" (scheduled on ${new Date(reservation.startDate).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}).`
            );
          }
        } else {
          const { space } = await spacesAPI.getOne(reservation.spaceId, token);
          if (space && space.managerId) {
            await messagesAPI.sendMessage(
              token,
              String(space.managerId),
              `[Notification] Booking Canceled | Coworker ${user?.name || 'anonymous'} has canceled their booking for space "${reservation.spaceName}" (scheduled on ${new Date(reservation.startDate).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}).`
            );
          }
        }
      } catch (err) {
        console.error('Failed to send reservation cancellation notification:', err);
      }

      await reservationsAPI.delete(token, id);
      setReservations(reservations.filter((r) => r.id !== id));
      setReservationToDeleteId(null);
    } catch (error: any) {
      alert(error.message || 'Error during cancellation');
      setReservationToDeleteId(null);
    }
  };

  // Remove reservation from UI list after completion (persisted in localStorage)
  const handleRemoveFromList = (id: string) => {
    const dismissed: string[] = JSON.parse(localStorage.getItem('dismissed_reservations') || '[]');
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem('dismissed_reservations', JSON.stringify(dismissed));
    }
    setReservations((prev) => prev.filter((r) => r.id !== id));
  };


  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setEditData({
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      hours: reservation.hours,
    });
  };

  const handleUpdate = async () => {
    if (!editingReservation || !token) return;

    try {
      await reservationsAPI.update(token, editingReservation.id, editData);

      // Send modification notification to the manager
      try {
        const { space } = await spacesAPI.getOne(editingReservation.spaceId, token);
        if (space && space.managerId) {
          await messagesAPI.sendMessage(
            token,
            String(space.managerId),
            `[Notification] Booking Modified | Coworker ${user?.name || 'anonymous'} has modified their booking for space "${editingReservation.spaceName}" (new slot: ${new Date(editData.startDate).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}).`
          );
        }
      } catch (err) {
        console.error('Failed to notify manager about reservation update:', err);
      }

      await loadReservations();
      setEditingReservation(null);
    } catch (error: any) {
      alert(error.message || 'Error during modification');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-sm font-semibold text-gray-500">Loading your bookings...</span>
        </div>
      </div>
    );
  }  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-full relative overflow-hidden bg-slate-50/20">
      {/* Floating background glowing blobs */}
      <div className="absolute top-[20%] left-[-10%] w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />
      
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider w-fit mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Bookings Supervision
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Bookings Tracking</h1>
          <p className="text-slate-500 text-sm mt-1">
            {user?.role === 'user' ? 'Manage and plan all your work sessions' : 'Track all sessions booked by coworkers'}
          </p>
        </div>
      </motion.div>

      {/* Coworker rating alert banner */}
      {(() => {
        const completedUnrated = reservations.filter((r) => {
          if (r.status !== 'completed' && r.status !== 'terminée') return false;
          const hasRated = (r.rating && r.rating > 0) || localStorage.getItem(`rated_res_${r.id}`);
          return !hasRated;
        });

        if (user?.role === 'user' && completedUnrated.length > 0) {
          const firstUnrated = completedUnrated[0];
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-gradient-to-r from-amber-50 via-amber-50/70 to-indigo-50/30 border-2 border-amber-250 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                  <Star className="w-6 h-6 fill-amber-500 text-amber-500 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Evaluation of your session required</h4>
                  <p className="text-xs text-slate-700 font-bold mt-1 leading-relaxed">
                    Your session in the space <strong className="text-indigo-750">{firstUnrated.spaceName}</strong> is complete. 
                    Leave us a rating to update the space average!
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedRating(5);
                  setSelectedComment('');
                  setRatingModalReservation(firstUnrated);
                }}
                className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-650 hover:brightness-105 text-white text-xs font-black rounded-2xl shadow-md transition-all flex-shrink-0"
              >
                Rate Now ⭐
              </button>
            </motion.div>
          );
        }
        return null;
      })()}

      {/* Grid Content */}
      {reservations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-white rounded-3xl border-2 border-slate-200/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)]"
        >
          <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-900 text-lg font-bold">No bookings at the moment</p>
          <p className="text-slate-650 text-sm mt-1">Explore the interactive map to plan your session</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reservations.map((reservation, index) => (
            <motion.div
              key={reservation.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 90, delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all p-6 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-40 -mr-8 -mb-8" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                      {reservation.spaceName}
                    </h3>
                    {reservation.userName && (
                      <p className="text-xs text-slate-600 font-bold mt-1">
                        Coworker : {reservation.userName} ({reservation.userEmail})
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {user?.role === 'user' && reservation.status !== 'completed' && reservation.status !== 'terminée' && (
                      <button
                        onClick={() => handleEdit(reservation)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit className="w-4.5 h-4.5" />
                      </button>
                    )}
                    {/* Cancel button for pending reservations */}
                    {reservation.status !== 'completed' && reservation.status !== 'terminée' ? (
                      <button
                        onClick={() => handleDelete(reservation.id)}
                        className="p-2 text-rose-650 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    ) : (
                      // Small X to simply remove from UI list after completion
                      <button
                        onClick={() => handleRemoveFromList(reservation.id)}
                        className="p-2 text-slate-500 hover:text-slate-700 rounded-xl transition-all"
                        title="Retirer de la liste"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t-2 border-slate-100">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                      <Calendar className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Start</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {formatDate(reservation.startDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                      <Calendar className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">End</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {formatDate(reservation.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Duration</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">{reservation.hours}h</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                      <Coins className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Total Price</p>
                      <p className="text-xs font-black text-indigo-750 mt-0.5">{reservation.totalPrice} DT</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-slate-100 flex items-center justify-between relative z-10">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                    reservation.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-50/20'
                      : reservation.status === 'completed' || reservation.status === 'terminée'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {reservation.status === 'confirmed' 
                    ? 'Confirmed' 
                    : reservation.status === 'completed' || reservation.status === 'terminée'
                    ? 'Completed' 
                    : 'Pending'}
                </span>

                {/* Manager / Admin confirmation and completion buttons */}
                {(user?.role === 'manager' || user?.role === 'admin') && (
                  <div className="flex items-center gap-2">
                    {reservation.status !== 'confirmed' && reservation.status !== 'completed' && reservation.status !== 'terminée' && (
                      <button
                        onClick={() => handleConfirm(reservation.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-105 text-white text-[10px] font-black rounded-lg shadow-sm transition-all"
                      >
                        Confirm
                      </button>
                    )}
                    {reservation.status === 'confirmed' && (
                      <button
                        onClick={() => handleComplete(reservation.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-655 hover:brightness-105 text-white text-[10px] font-black rounded-lg shadow-sm transition-all"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                )}

                {/* Coworker rating button */}
                {user?.role === 'user' && (reservation.status === 'completed' || reservation.status === 'terminée') && (
                  <div>
                    {((reservation.rating && reservation.rating > 0) || localStorage.getItem(`rated_res_${reservation.id}`)) ? (
                      <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
                        Rated ({reservation.rating || localStorage.getItem(`rated_res_${reservation.id}`)}/5)
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedRating(5);
                          setSelectedComment('');
                          setRatingModalReservation(reservation);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-white text-[10px] font-black rounded-lg shadow-sm transition-all flex items-center gap-1"
                      >
                        <Star className="w-3 h-3 fill-white text-white" />
                        Rate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editingReservation && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Modify Booking</h3>
                  <p className="text-xs text-gray-400 mt-1">Modify dates or duration of the session</p>
                </div>
                <button
                  onClick={() => setEditingReservation(null)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4.5 mb-6">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={editData.startDate}
                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-bold text-slate-900 placeholder-slate-450"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={editData.endDate}
                    onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-bold text-slate-900 placeholder-slate-450"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Number of Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editData.hours}
                    onChange={(e) => setEditData({ ...editData, hours: parseInt(e.target.value) })}
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-bold text-slate-900 placeholder-slate-450"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleUpdate}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-md transition-colors text-sm"
              >
                Save Changes
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingModalReservation && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl border border-slate-100 text-slate-900"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Rate Space</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    {ratingModalReservation.spaceName}
                  </p>
                </div>
                <button
                  onClick={() => setRatingModalReservation(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-sm text-slate-600 font-bold mb-3">How would you rate this space?</p>
                
                {/* 5 Stars display */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      className="p-1 transition-transform active:scale-90 hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= selectedRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-350 fill-transparent hover:text-amber-350'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <span className="text-lg font-black text-amber-500 mt-3">
                  {selectedRating === 5 ? 'Excellent! 🌟' :
                   selectedRating === 4 ? 'Very good 👍' :
                   selectedRating === 3 ? 'Average 😐' :
                   selectedRating === 2 ? 'Poor 👎' :
                   'Very disappointing 😞'}
                </span>
              </div>

              {/* Comment text area */}
              <div className="space-y-1.5 mt-2">
                <label className="block text-sm font-black text-slate-800">
                  Comments on comfort and environment
                </label>
                <textarea
                  value={selectedComment}
                  onChange={(e) => setSelectedComment(e.target.value)}
                  placeholder="Share your experience regarding comfort, noise, equipment, etc."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-bold text-slate-900 placeholder-slate-400 resize-none"
                />
              </div>

              <button
                onClick={() => submitRating(ratingModalReservation, selectedRating, selectedComment)}
                className="w-full mt-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 hover:brightness-105 transition-all text-base flex items-center justify-center gap-2"
              >
                Submit my rating
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete/Cancel Confirmation Modal */}
      <AnimatePresence>
        {reservationToDeleteId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Cancel Booking?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setReservationToDeleteId(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  No, Keep it
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
