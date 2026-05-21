import { useEffect, useState } from 'react';
import { spacesAPI, reservationsAPI, messagesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, MapPin, Users, Coins, Star, Edit, Trash2, X, Upload, ShieldAlert, Sparkles, Building2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  managerId: string;
  managerName?: string;
  managerEmail?: string;
  images?: string[];
  type?: string;
}

export function SpacesManagementPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [spaceToDeleteId, setSpaceToDeleteId] = useState<string | null>(null);
  const { token, user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: 36.8065,
    lng: 10.1815,
    capacity: 10,
    pricePerHour: 5,
    amenities: [] as string[],
    images: [] as string[],
    type: 'collaboratif',
  });

  const [amenityInput, setAmenityInput] = useState('');
  const [imageInput, setImageInput] = useState('');

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      if (!token) return;
      const data = await spacesAPI.getAll(token);
      setSpaces(data.spaces);
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim() && !formData.amenities.includes(amenityInput.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenityInput.trim()],
      });
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (index: number) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((_, i) => i !== index),
    });
  };

  const handleImageBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileReaders: Promise<string>[] = Array.from(files).map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(fileReaders).then((base64Images) => {
        setFormData({
          ...formData,
          images: [...formData.images, ...base64Images],
        });
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (user?.role === 'admin' && !editingSpace) {
      alert('Administrators cannot create coworking spaces. This action is reserved for managers.');
      return;
    }

    if (isNaN(formData.lat) || isNaN(formData.lng)) {
      alert('Please enter valid GPS coordinates.');
      return;
    }

    try {
      if (editingSpace) {
        await spacesAPI.update(token, editingSpace.id, formData);

        // Notify affected users who have active bookings in this space
        try {
          const { reservations } = await reservationsAPI.getForSpace(editingSpace.id, token);
          const activeBookings = reservations.filter((r: any) =>
            r.spaceId === editingSpace.id &&
            (r.status === 'confirmed' || r.status === 'pending' || r.status === 'en attente' || r.status === 'confirmée')
          );
          
          // Get unique user IDs
          const userIdsToNotify = Array.from(new Set(activeBookings.map((r: any) => r.userId).filter(Boolean)));
          
          for (const userId of userIdsToNotify) {
            await messagesAPI.sendMessage(
              token,
              String(userId),
              `[Notification] Space Modified | The manager has updated the details of the space "${editingSpace.name}" in which you have an active booking.`
            );
          }
        } catch (err) {
          console.error('Failed to notify users about space modification:', err);
        }
      } else {
        await spacesAPI.create(token, formData);
      }
      setShowAddModal(false);
      setEditingSpace(null);
      resetForm();
      loadSpaces();
    } catch (error) {
      console.error('Failed to save space:', error);
    }
  };

  const handleEdit = (space: Space) => {
    let mName = space.managerName;
    let mEmail = space.managerEmail;
    if (typeof space.managerId === 'object' && space.managerId !== null) {
      const mObj: any = space.managerId;
      if (!mName) mName = mObj.username || mObj.name;
      if (!mEmail) mEmail = mObj.email;
    }

    setEditingSpace(space);
    setFormData({
      name: space.name,
      address: space.address,
      lat: space.lat,
      lng: space.lng,
      capacity: space.capacity,
      pricePerHour: space.pricePerHour,
      amenities: space.amenities || [],
      images: space.images || [],
      type: space.type || 'collaboratif',
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    setSpaceToDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!token || !spaceToDeleteId) return;
    const id = spaceToDeleteId;
    const spaceToDelete = spaces.find(s => s.id === id);
    if (!spaceToDelete) return;

    try {
      // Fetch reservations and notify affected users BEFORE deletion
      try {
        const { reservations } = await reservationsAPI.getForSpace(id, token);
        const activeBookings = reservations.filter((r: any) =>
          r.spaceId === id &&
          (r.status === 'confirmed' || r.status === 'pending' || r.status === 'en attente' || r.status === 'confirmée')
        );
        
        const userIdsToNotify = Array.from(new Set(activeBookings.map((r: any) => r.userId).filter(Boolean)));
        
        for (const userId of userIdsToNotify) {
          await messagesAPI.sendMessage(
            token,
            String(userId),
            `[Notification] Space Deleted | The space "${spaceToDelete.name}" has been permanently deleted/closed by the manager. Your booking has been canceled.`
          );
        }
      } catch (err) {
        console.error('Failed to notify users about space deletion:', err);
      }

      await spacesAPI.delete(token, id);
      setSpaceToDeleteId(null);
      loadSpaces();
    } catch (error: any) {
      console.error('Failed to delete space:', error);
      alert(error.message || 'Error deleting space. Please check if you have delete permissions.');
      setSpaceToDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      lat: 36.8065,
      lng: 10.1815,
      capacity: 10,
      pricePerHour: 5,
      amenities: [],
      images: [],
      type: 'collaboratif',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <span className="text-sm font-semibold text-gray-500">Loading your spaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-full relative overflow-hidden bg-slate-50/20">
      {/* Floating background glowing blobs */}
      <div className="absolute top-[20%] left-[-10%] w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider w-fit mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Spaces Supervision
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Spaces Management</h1>
          <p className="text-slate-500 text-sm mt-1">View, edit, and manage your list of coworking spaces</p>
        </div>
        {user?.role !== 'admin' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              resetForm();
              setEditingSpace(null);
              setShowAddModal(true);
            }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Space
          </motion.button>
        )}
      </motion.div>

      {/* Grid List */}
      {spaces.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-white rounded-3xl border-2 border-slate-200/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)]"
        >
          <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-900 text-lg font-bold">No spaces available</p>
          <p className="text-slate-650 text-sm mt-1">Click "Add Space" to get started</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space, index) => (
            <motion.div
              key={space.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 90, delay: index * 0.05 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Space Carousel/Image Section */}
              <SpaceImageCarousel space={space} />

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Space Type Badge */}
                  <div className="mb-2">
                    {space.type === 'silencieux' ? (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border border-purple-100 shadow-sm">
                        🤫 Silencieux
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border border-teal-100 shadow-sm">
                        🤝 Collaboratif
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2 truncate">{space.name}</h3>

                  {/* Creator label for Admins */}
                  {user?.role === 'admin' && (() => {
                    let mName = space.managerName;
                    let mEmail = space.managerEmail;
                    
                    if (typeof space.managerId === 'object' && space.managerId !== null) {
                      const mObj: any = space.managerId;
                      if (!mName) mName = mObj.username || mObj.name;
                      if (!mEmail) mEmail = mObj.email;
                    }

                    if (mName || mEmail) {
                      return (
                        <div className="mb-3 flex flex-col gap-1">
                          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md w-fit border border-indigo-100">
                            <Users className="w-3 h-3" />
                            Created by: {mName || 'Manager'}
                          </div>
                          {mEmail && (
                            <div className="text-[10px] text-slate-600 font-semibold ml-1">
                              Contact: {mEmail}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="mb-3 inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-200">
                        <Users className="w-3 h-3" />
                        Created by: Unknown Manager
                      </div>
                    );
                  })()}

                  <p className="text-xs text-slate-700 mb-4 flex items-start gap-1.5 leading-relaxed font-semibold">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-500 mt-0.5" />
                    {space.address}
                  </p>

                  <div className="space-y-2 mt-4 pt-4 border-t-2 border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        Capacity
                      </span>
                      <span className="font-bold text-slate-900">{space.capacity} people</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-500" />
                        Hourly Rate
                      </span>
                      <span className="font-extrabold text-indigo-700">{space.pricePerHour} DT / hour</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-yellow-500" />
                        Rating
                      </span>
                      <span className="font-bold text-slate-900">{space.rating} / 5</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-6 mt-6 border-t-2 border-slate-100">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEdit(space)}
                    className="flex-1 bg-indigo-50 text-indigo-700 py-2.5 rounded-xl font-bold transition-all hover:bg-indigo-100 flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDelete(space.id)}
                    className="flex-1 bg-rose-50 text-rose-700 py-2.5 rounded-xl font-bold transition-all hover:bg-rose-100 flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit modal popup */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingSpace ? 'Modify Space' : 'Add Space'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Fill in the details of the coworking space</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4.5">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Space Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    placeholder="Tunis Coworking Space"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Full Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    placeholder="Habib Bourguiba Avenue, Tunis"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-1.5">
                      Latitude (required)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={isNaN(formData.lat) ? '' : formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                      required
                      className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900 placeholder-slate-450"
                      placeholder="36.8065"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-1.5">
                      Longitude (required)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={isNaN(formData.lng) ? '' : formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                      required
                      className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900 placeholder-slate-450"
                      placeholder="10.1815"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-1.5">
                      Capacity (people)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                      required
                      className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-900 mb-1.5">
                      Rate (DT/hour)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.pricePerHour}
                      onChange={(e) => setFormData({ ...formData, pricePerHour: parseFloat(e.target.value) })}
                      required
                      className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Type d'espace
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900"
                  >
                    <option value="collaboratif">Collaboratif 🤝</option>
                    <option value="silencieux">Silencieux 🤫</option>
                  </select>
                </div>

                {/* Amenities section */}
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Included Amenities
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={amenityInput}
                      onChange={(e) => setAmenityInput(e.target.value)}
                      className="flex-1 px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900 placeholder-slate-450"
                      placeholder="e.g., High-speed Internet, Free Coffee"
                    />
                    <button
                      type="button"
                      onClick={handleAddAmenity}
                      className="px-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors text-xs"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl">
                    {formData.amenities.length === 0 ? (
                      <span className="text-[10px] text-gray-400 font-semibold p-1">No amenities listed</span>
                    ) : (
                      formData.amenities.map((amenity, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-100 shadow-sm"
                        >
                          {amenity}
                          <button
                            type="button"
                            onClick={() => handleRemoveAmenity(index)}
                            className="text-red-500 hover:text-red-700 font-bold ml-1"
                          >
                            &times;
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Images section */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Space Photos
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer">
                      <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                      <span className="text-xs text-slate-600 font-bold">Choose photos from my computer</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">PNG, JPG formats (multiple allowed)</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageBrowse}
                        className="hidden"
                      />
                    </label>
                    
                    {formData.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl max-h-28 overflow-y-auto">
                        {formData.images.map((base64, index) => (
                          <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square">
                            <img src={base64} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 bg-black bg-opacity-70 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors text-xs font-bold"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3.5 rounded-2xl font-bold shadow-md transition-all text-sm mt-4"
                >
                  {editingSpace ? 'Save Changes' : 'Create Coworking Space'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {spaceToDeleteId && (
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
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Space?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to permanently delete this space? All associated active bookings will be canceled.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSpaceToDeleteId(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Separate Mini Component for space image display carousel
function SpaceImageCarousel({ space }: { space: Space }) {
  const spaceImages = space.images || [];
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % spaceImages.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + spaceImages.length) % spaceImages.length);
  };

  return (
    <div className="relative h-48 w-full group overflow-hidden bg-slate-100">
      {spaceImages.length > 0 ? (
        <>
          <img
            src={spaceImages[currentImgIndex]}
            alt={space.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {spaceImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 font-bold text-xs"
              >
                &#10094;
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 font-bold text-xs"
              >
                &#10095;
              </button>
              <div className="absolute bottom-3 right-3 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
                {currentImgIndex + 1} / {spaceImages.length}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <Building2 className="w-12 h-12 text-white opacity-80" />
        </div>
      )}
    </div>
  );
}
