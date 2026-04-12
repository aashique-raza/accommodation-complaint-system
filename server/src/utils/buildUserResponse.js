const buildUserResponse = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    accountStatus: user.accountStatus,
    isEmailVerified: user.isEmailVerified,

    profile: {
      enrollmentNo: user.profile?.enrollmentNo || null,
      department: user.profile?.department || null,
      course: user.profile?.course || null,
      year: user.profile?.year ?? null,
      avatar: user.profile?.avatar || null,
    },

    accommodation: {
      accommodationType: user.accommodation?.accommodationType || null,
      hostel: user.accommodation?.hostelId
        ? {
            id: user.accommodation.hostelId._id,
            name: user.accommodation.hostelId.name,
            code: user.accommodation.hostelId.code,
            type: user.accommodation.hostelId.type,
          }
        : null,
      block: user.accommodation?.block || null,
      floor: user.accommodation?.floor || null,
      roomNumber: user.accommodation?.roomNumber || null,
    },
  };
};

export default buildUserResponse;
