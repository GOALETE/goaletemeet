const { PrismaClient } = require('./app/generated/prisma');

const prisma = new PrismaClient();

async function debugDatabase() {
  try {
    console.log('=== USERS ===');
    const users = await prisma.user.findMany({
      include: {
        subscriptions: true
      }
    });
    
    console.log(`Total users: ${users.length}`);
    users.forEach(user => {
      console.log(`User: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`  Subscriptions: ${user.subscriptions.length}`);
      user.subscriptions.forEach(sub => {
        console.log(`    - Plan: ${sub.planType}, Status: ${sub.status}, Payment: ${sub.paymentStatus}`);
        console.log(`    - Start: ${sub.startDate}, End: ${sub.endDate}`);
        console.log(`    - Price: ${sub.price}`);
      });
    });
    
    console.log('\n=== SUBSCRIPTIONS ===');
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: true
      }
    });
    
    console.log(`Total subscriptions: ${subscriptions.length}`);
    
    const today = new Date();
    const activeSubscriptions = subscriptions.filter(sub => 
      sub.startDate <= today && sub.endDate >= today
    );
    
    const expiredSubscriptions = subscriptions.filter(sub => 
      sub.endDate < today
    );
    
    const upcomingSubscriptions = subscriptions.filter(sub => 
      sub.startDate > today
    );
    
    console.log(`Active subscriptions: ${activeSubscriptions.length}`);
    console.log(`Expired subscriptions: ${expiredSubscriptions.length}`);
    console.log(`Upcoming subscriptions: ${upcomingSubscriptions.length}`);
    
    const totalRevenue = subscriptions
      .filter(sub => sub.paymentStatus === 'completed' || sub.paymentStatus === 'paid' || sub.paymentStatus === 'success')
      .reduce((sum, sub) => sum + (sub.price || 0), 0);
    
    console.log(`Total revenue: ₹${totalRevenue}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase();
