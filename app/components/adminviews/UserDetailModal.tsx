import React from 'react';
import { format } from 'date-fns';

export type Subscription = {
  id: string;
  planType: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  duration?: number;
  price?: number;
  orderId: string;
};

export type UserWithSubscriptions = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  createdAt: string;
  subscriptions: Subscription[];
};

interface UserDetailModalProps {
  user: UserWithSubscriptions;
  show: boolean;
  onClose: () => void;
  modalSortBy: keyof Subscription;
  modalSortOrder: 'asc' | 'desc';
  modalFilterStatus: string;
  modalFilterPayment: string;
  setModalFilterStatus: (status: string) => void;
  setModalFilterPayment: (status: string) => void;
  handleModalSort: (field: keyof Subscription) => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  show,
  onClose,
  modalSortBy,
  modalSortOrder,
  modalFilterStatus,
  modalFilterPayment,
  setModalFilterStatus,
  setModalFilterPayment,
  handleModalSort,
}) => {
  if (!show || !user) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>User Details</h2>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Joined Date:</strong> {format(new Date(user.createdAt), 'MMMM dd, yyyy')}</p>
        {/* Add more user details as needed */}
      </div>
    </div>
  );
};

export default UserDetailModal;
