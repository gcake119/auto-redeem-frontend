import AutoRedeemDashboard from '@/components/AutoRedeemDashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
        <AutoRedeemDashboard />
      </div>
    </div>
  );
}
