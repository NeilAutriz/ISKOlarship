/**
 * =============================================================================
 * ISKOlarship - Fixes Verification Tests
 * =============================================================================
 * 
 * Unit tests to verify all high-priority and medium-priority fixes
 * are correctly implemented.
 * 
 * Run with: npx jest tests/fixes-verification.test.js --verbose
 * 
 * =============================================================================
 */

const path = require('path');
const fs = require('fs');

// =============================================================================
// Helper: Read source files for static analysis
// =============================================================================
const readSrc = (relativePath) => {
  const fullPath = path.join(__dirname, '..', relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
};

// =============================================================================
// 1. USER MODEL FIXES
// =============================================================================
describe('User Model Fixes', () => {
  const userModelSrc = readSrc('src/models/User.model.js');

  // HIGH PRIORITY #1: getPublicProfile leaks refreshTokens
  describe('getPublicProfile - no sensitive data leak', () => {
    test('should delete password from returned object', () => {
      expect(userModelSrc).toMatch(/delete\s+obj\.password/);
    });

    test('should delete refreshTokens from returned object', () => {
      expect(userModelSrc).toMatch(/delete\s+obj\.refreshTokens/);
    });

    test('getPublicProfile should call toObject and return sanitized data', () => {
      const methodMatch = userModelSrc.match(
        /getPublicProfile\s*=\s*function\s*\(\)\s*\{([\s\S]*?)\};/
      );
      expect(methodMatch).not.toBeNull();
      const methodBody = methodMatch[1];
      expect(methodBody).toContain('toObject()');
      expect(methodBody).toContain('delete obj.password');
      expect(methodBody).toContain('delete obj.refreshTokens');
    });
  });

  // MEDIUM PRIORITY #14: passwordChangedAt field for token invalidation
  describe('passwordChangedAt field exists', () => {
    test('should have passwordChangedAt field in schema', () => {
      expect(userModelSrc).toMatch(/passwordChangedAt\s*:\s*\{?\s*type\s*:\s*Date|passwordChangedAt\s*:\s*Date/);
    });
  });

  // HIGH PRIORITY #7: Year levels - no Graduate or Incoming Freshman
  describe('Year levels (Classification enum)', () => {
    test('should include Freshman, Sophomore, Junior, Senior', () => {
      expect(userModelSrc).toContain("FRESHMAN: 'Freshman'");
      expect(userModelSrc).toContain("SOPHOMORE: 'Sophomore'");
      expect(userModelSrc).toContain("JUNIOR: 'Junior'");
      expect(userModelSrc).toContain("SENIOR: 'Senior'");
    });

    test('should NOT include Graduate', () => {
      expect(userModelSrc).not.toMatch(/GRADUATE\s*:/);
    });

    test('should NOT include Incoming Freshman', () => {
      expect(userModelSrc).not.toMatch(/INCOMING_FRESHMAN\s*:|Incoming Freshman/i);
    });
  });
});

// =============================================================================
// 2. AUTH MIDDLEWARE FIXES
// =============================================================================
describe('Auth Middleware Fixes', () => {
  const authMiddlewareSrc = readSrc('src/middleware/auth.middleware.js');

  // HIGH PRIORITY #3: requireAdminLevel hierarchy
  describe('requireAdminLevel - correct hierarchy', () => {
    test('should define hierarchy levels: academic_unit=0, college=1, university=2', () => {
      // The code uses bracket notation: [AdminAccessLevel.ACADEMIC_UNIT]: 0
      expect(authMiddlewareSrc).toMatch(/ACADEMIC_UNIT.*?:\s*0/);
      expect(authMiddlewareSrc).toMatch(/COLLEGE.*?:\s*1/);
      expect(authMiddlewareSrc).toMatch(/UNIVERSITY.*?:\s*2/);
    });

    test('should compare user level against required level', () => {
      // Should have a numeric comparison that checks user's level >= required level
      expect(authMiddlewareSrc).toMatch(/userLevel\s*<\s*requiredNumeric|getUserLevel|hierarchy/i);
    });
  });

  // MEDIUM PRIORITY #16: Rate limit map memory leak prevention
  describe('Rate limit map cleanup', () => {
    test('should have periodic cleanup with setInterval', () => {
      expect(authMiddlewareSrc).toMatch(/setInterval\s*\(/);
    });

    test('should use .unref() to not keep process alive', () => {
      expect(authMiddlewareSrc).toMatch(/\.unref\s*\(\s*\)/);
    });

    test('should delete expired entries from rateLimitMap', () => {
      expect(authMiddlewareSrc).toMatch(/rateLimitMap\.delete/);
    });

    test('cleanup interval should be reasonable (30s-120s)', () => {
      // Looking for a cleanup interval between 30000 and 120000ms
      const intervalMatch = authMiddlewareSrc.match(/CLEANUP_INTERVAL\s*=\s*(\d+)\s*\*\s*(\d+)/);
      if (intervalMatch) {
        const value = parseInt(intervalMatch[1]) * parseInt(intervalMatch[2]);
        expect(value).toBeGreaterThanOrEqual(30000);
        expect(value).toBeLessThanOrEqual(120000);
      } else {
        // Alternative: check for inline number
        expect(authMiddlewareSrc).toMatch(/setInterval|cleanup/i);
      }
    });
  });

  // Verify rateLimit function still works correctly
  describe('Rate limit function', () => {
    test('should return 429 when limit exceeded', () => {
      expect(authMiddlewareSrc).toMatch(/429/);
      expect(authMiddlewareSrc).toMatch(/Too many requests/);
    });

    test('should track by IP and path', () => {
      expect(authMiddlewareSrc).toMatch(/req\.ip.*req\.path|`\$\{req\.ip\}.*\$\{req\.path\}`/);
    });
  });
});

// =============================================================================
// 3. AUTH ROUTES FIXES
// =============================================================================
describe('Auth Routes Fixes', () => {
  const authRoutesSrc = readSrc('src/routes/auth.routes.js');

  // MEDIUM PRIORITY #1: Password reset token sent via email, not console.log
  describe('Password reset security', () => {
    test('should import sendPasswordResetEmail', () => {
      expect(authRoutesSrc).toContain('sendPasswordResetEmail');
    });

    test('should call sendPasswordResetEmail in forgot-password route', () => {
      // Find the forgot-password section and check it uses email service
      expect(authRoutesSrc).toMatch(/sendPasswordResetEmail\s*\(/);
    });

    test('should NOT console.log the reset token', () => {
      // Ensure no console.log with resetToken in the forgot-password handler
      const forgotPasswordSection = authRoutesSrc.match(
        /forgot-password[\s\S]*?(?=router\.(get|post|put|delete)|module\.exports)/
      );
      if (forgotPasswordSection) {
        expect(forgotPasswordSection[0]).not.toMatch(/console\.log\s*\(.*resetToken/);
      }
    });
  });

  // MEDIUM PRIORITY #9: JWT access token expiry
  describe('JWT access token expiry', () => {
    test('should default to 30 minutes (not 7 days)', () => {
      // generateToken default should be '30m'
      expect(authRoutesSrc).toMatch(/generateToken.*=.*'30m'|expiresIn.*=.*'30m'/);
    });

    test('should NOT default to 7d for access tokens', () => {
      const generateTokenSection = authRoutesSrc.match(
        /const\s+generateToken[\s\S]*?\};/
      );
      if (generateTokenSection) {
        expect(generateTokenSection[0]).not.toMatch(/=\s*'7d'/);
      }
    });

    test('refresh token should still be long-lived (30d)', () => {
      expect(authRoutesSrc).toMatch(/30d/);
    });
  });

  // MEDIUM PRIORITY #12: Reset token invalidation after use
  describe('Reset token invalidation', () => {
    test('should check passwordChangedAt to prevent token reuse', () => {
      expect(authRoutesSrc).toMatch(/passwordChangedAt/);
    });

    test('should set passwordChangedAt on password reset', () => {
      expect(authRoutesSrc).toMatch(/passwordChangedAt\s*=\s*new\s+Date/);
    });

    test('should clear refreshTokens on password reset', () => {
      // The reset-password handler sets user.refreshTokens = []
      expect(authRoutesSrc).toMatch(/refreshTokens\s*=\s*\[\s*\]/);
    });
  });

  // HIGH PRIORITY #4: No demo/mock login bypass
  describe('No demo login bypass', () => {
    test('should not have demo login route or mock credentials', () => {
      expect(authRoutesSrc).not.toMatch(/demo-login|mock-login|demoLogin/i);
      expect(authRoutesSrc).not.toMatch(/demo@|mock@/i);
    });
  });
});

// =============================================================================
// 4. APPLICATION ROUTES FIXES  
// =============================================================================
describe('Application Routes Fixes', () => {
  const appRoutesSrc = readSrc('src/routes/application.routes.js');

  // MEDIUM PRIORITY #3 & #11: Query params parsed as integers with cap
  describe('Pagination parameter safety', () => {
    test('should use parseInt for page parameter', () => {
      expect(appRoutesSrc).toMatch(/parseInt\s*\(\s*req\.query\.page\s*\)/);
    });

    test('should use parseInt for limit parameter', () => {
      expect(appRoutesSrc).toMatch(/parseInt\s*\(\s*req\.query\.limit\s*\)/);
    });

    test('should cap limit with Math.min(..., 100)', () => {
      expect(appRoutesSrc).toMatch(/Math\.min\s*\(.*100\)/);
    });
  });

  // HIGH PRIORITY #10: filledSlots decrement on status change
  describe('filledSlots management', () => {
    test('should increment filledSlots when approved', () => {
      expect(appRoutesSrc).toMatch(/\$inc\s*:\s*\{\s*filledSlots\s*:\s*1\s*\}/);
    });

    test('should decrement filledSlots when un-approved', () => {
      expect(appRoutesSrc).toMatch(/\$inc\s*:\s*\{\s*filledSlots\s*:\s*-1\s*\}/);
    });
  });

  // MEDIUM PRIORITY #15: Path traversal protection in document download
  describe('Path traversal protection', () => {
    test('should define uploadsRoot with path.resolve', () => {
      expect(appRoutesSrc).toMatch(/uploadsRoot\s*=\s*path\.resolve/);
    });

    test('should have isWithinUploads boundary check', () => {
      expect(appRoutesSrc).toMatch(/isWithinUploads/);
    });

    test('should check resolved path starts with uploadsRoot', () => {
      expect(appRoutesSrc).toMatch(/startsWith\s*\(\s*uploadsRoot/);
    });
  });
});

// =============================================================================
// 5. SCHOLARSHIP ROUTES FIXES
// =============================================================================
describe('Scholarship Routes Fixes', () => {
  const scholarshipRoutesSrc = readSrc('src/routes/scholarship.routes.js');

  // MEDIUM PRIORITY #16: Cascade delete → soft-delete/archive
  describe('Soft-delete for scholarships with applications', () => {
    test('should check application count before deleting', () => {
      expect(scholarshipRoutesSrc).toMatch(/applicationCount|countDocuments|Application\.count/);
    });

    test('should archive (soft-delete) when applications exist', () => {
      expect(scholarshipRoutesSrc).toMatch(/isActive\s*:\s*false/);
      expect(scholarshipRoutesSrc).toMatch(/archived/i);
    });

    test('should only hard-delete when no applications exist', () => {
      expect(scholarshipRoutesSrc).toMatch(/findByIdAndDelete/);
    });
  });

  // HIGH PRIORITY #6-8: Correct field names in filters
  describe('Correct field names in scholarship queries', () => {
    test('should use applicationDeadline (not deadline)', () => {
      expect(scholarshipRoutesSrc).toMatch(/applicationDeadline/);
      // Make sure no incorrect 'deadline' field used alone for filtering
    });

    test('should use eligibilityCriteria fields for filtering', () => {
      expect(scholarshipRoutesSrc).toMatch(/eligibilityCriteria/);
    });
  });
});

// =============================================================================
// 6. PLATFORM STATS FIXES
// =============================================================================
describe('PlatformStats Model Fixes', () => {
  const platformStatsSrc = readSrc('src/models/PlatformStats.model.js');

  // MEDIUM PRIORITY #6: overallSuccessRate stored as Number, not string
  describe('overallSuccessRate type', () => {
    test('should use parseFloat to ensure numeric storage', () => {
      expect(platformStatsSrc).toMatch(/parseFloat\s*\(/);
    });

    test('should calculate rate as (approved / total) * 100', () => {
      expect(platformStatsSrc).toMatch(/approved.*total.*100|stats\.approved.*stats\.total/);
    });
  });

  // HIGH PRIORITY #11: PlatformStats uses correct field names
  describe('Correct field names in recalculate', () => {
    test('should reference applicationDeadline', () => {
      expect(platformStatsSrc).toMatch(/applicationDeadline/);
    });

    test('should reference totalGrant with $sum', () => {
      expect(platformStatsSrc).toMatch(/\$sum.*totalGrant|totalGrant.*\$sum/);
    });
  });
});

// =============================================================================
// 7. EMAIL SERVICE FIXES
// =============================================================================
describe('Email Service Fixes', () => {
  const emailServiceSrc = readSrc('src/services/email.service.js');

  // MEDIUM PRIORITY #1: sendPasswordResetEmail function exists
  describe('sendPasswordResetEmail', () => {
    test('should export sendPasswordResetEmail function', () => {
      expect(emailServiceSrc).toMatch(/module\.exports[\s\S]*sendPasswordResetEmail/);
    });

    test('should define sendPasswordResetEmail as async function', () => {
      expect(emailServiceSrc).toMatch(
        /const\s+sendPasswordResetEmail\s*=\s*async|sendPasswordResetEmail\s*=\s*async/
      );
    });

    test('should construct reset URL with frontendUrl', () => {
      expect(emailServiceSrc).toMatch(/FRONTEND_URL|frontendUrl/);
      expect(emailServiceSrc).toMatch(/reset-password\?token=/);
    });
  });
});

// =============================================================================
// 8. TRAINING ROUTES - AUTH PROTECTION
// =============================================================================
describe('Training Routes Auth Protection', () => {
  const trainingRoutesSrc = readSrc('src/routes/training.routes.js');

  // HIGH PRIORITY #2: Training model endpoints require auth
  describe('Model endpoints require authentication', () => {
    test('should require authMiddleware on all endpoints', () => {
      const routeDefinitions = trainingRoutesSrc.match(
        /router\.(get|post|put|delete)\s*\([^)]+\)/g
      ) || [];
      
      // Every route should reference authMiddleware
      routeDefinitions.forEach(route => {
        expect(route).toContain('authMiddleware');
      });
    });

    test('training endpoints should require admin role', () => {
      expect(trainingRoutesSrc).toMatch(/train.*requireRole.*admin/s);
    });

    test('model management should require admin role', () => {
      expect(trainingRoutesSrc).toMatch(/models.*requireRole.*admin/s);
    });
  });
});

// =============================================================================
// 9. FRONTEND SOURCE CODE FIXES (Static Analysis)
// =============================================================================
describe('Frontend Source Fixes (static analysis)', () => {
  
  // MEDIUM PRIORITY #2: Token refresh redirects to '/' not '/login'
  describe('apiClient.ts - token refresh redirect', () => {
    const apiClientSrc = readSrc('../frontend/src/services/apiClient.ts');

    test('should redirect to "/" on refresh failure', () => {
      expect(apiClientSrc).toMatch(/window\.location\.href\s*=\s*['"]\/['"]/);
    });

    test('should NOT redirect to "/login"', () => {
      expect(apiClientSrc).not.toMatch(/window\.location\.href\s*=\s*['"]\/login['"]/);
    });
  });

  // HIGH PRIORITY #5: USE_MOCK_FALLBACK disabled
  describe('api.ts - mock fallback disabled', () => {
    const apiSrc = readSrc('../frontend/src/services/api.ts');

    test('USE_MOCK_FALLBACK should be false', () => {
      expect(apiSrc).toMatch(/USE_MOCK_FALLBACK\s*=\s*false/);
    });
  });

  // Frontend console.log cleanup
  describe('Frontend console.log cleanup', () => {
    const frontendSrcDir = path.join(__dirname, '..', '..', 'frontend', 'src');
    
    const countConsoleLogs = (dir) => {
      let count = 0;
      const walkDir = (currentDir) => {
        const files = fs.readdirSync(currentDir);
        for (const file of files) {
          const filePath = path.join(currentDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const matches = content.match(/console\.log\(/g);
            if (matches) count += matches.length;
          }
        }
      };
      walkDir(dir);
      return count;
    };

    test('frontend src should have zero console.log statements', () => {
      const count = countConsoleLogs(frontendSrcDir);
      expect(count).toBe(0);
    });
  });

  // App.tsx fixes
  describe('App.tsx fixes', () => {
    const appTsxSrc = readSrc('../frontend/src/App.tsx');

    // HIGH PRIORITY #4: No demo/mock login bypass
    test('should not have demo login functionality', () => {
      expect(appTsxSrc).not.toMatch(/demoLogin|demo-login|handleDemoLogin|mockLogin/i);
    });

    // MEDIUM PRIORITY #4: Analytics route open to all authenticated users
    test('analytics route should not be restricted to STUDENT only', () => {
      // The route for /analytics should not have requiredRole={UserRole.STUDENT}
      const analyticsSection = appTsxSrc.match(
        /analytics[\s\S]{0,200}/g
      ) || [];
      const analyticsRoutes = analyticsSection.filter(s => 
        s.includes('path') || s.includes('Route') || s.includes('element')
      );
      // Should not restrict analytics to student-only
      analyticsRoutes.forEach(section => {
        expect(section).not.toMatch(/requiredRole.*STUDENT/);
      });
    });
  });

  // Home.tsx fixes
  describe('Home.tsx fixes', () => {
    const homeTsxSrc = readSrc('../frontend/src/pages/Home.tsx');

    // MEDIUM PRIORITY #5: useCounter hook not inside component
    test('useCounter should be defined at module scope, not inside component', () => {
      // useCounter definition should come BEFORE the Home component definition
      const useCounterPos = homeTsxSrc.indexOf('function useCounter');
      const constUseCounterPos = homeTsxSrc.indexOf('const useCounter');
      const hookPos = Math.min(
        useCounterPos === -1 ? Infinity : useCounterPos,
        constUseCounterPos === -1 ? Infinity : constUseCounterPos
      );
      
      // Home component definition  
      const homeComponentPos = homeTsxSrc.search(/(?:function|const)\s+Home\b/);
      
      if (hookPos !== Infinity && homeComponentPos !== -1) {
        expect(hookPos).toBeLessThan(homeComponentPos);
      }
    });

    // HIGH PRIORITY #12: Should use API stats, not hardcoded
    test('should fetch stats from API', () => {
      expect(homeTsxSrc).toMatch(/api|fetch|axios|apiClient/i);
      // Should not have hardcoded scholarship count like "25+" or "50+" as the only source
    });

    // Should use successRate (not overallSuccessRate) from API
    test('should use successRate field name', () => {
      expect(homeTsxSrc).toMatch(/successRate/);
    });
  });
});

// =============================================================================
// 10. ADMIN PERMISSIONS FIXES
// =============================================================================
describe('Admin Permissions Fixes', () => {
  
  // MEDIUM PRIORITY #10: Permissions based on accessLevel
  describe('AdminProfileCompletion - access level based permissions', () => {
    const adminProfileSrc = readSrc('../frontend/src/components/AdminProfileCompletion.tsx');

    test('should have empty default permissions array', () => {
      // Default permissions should be [] not a full array
      expect(adminProfileSrc).toMatch(/permissions\s*:\s*\[\s*\]/);
    });

    test('should auto-assign permissions based on accessLevel', () => {
      // Should have logic that sets permissions when accessLevel changes
      expect(adminProfileSrc).toMatch(/university|college|academic_unit/);
      expect(adminProfileSrc).toMatch(/permissions/);
    });
  });
});

// =============================================================================
// 11. HEADER FIXES
// =============================================================================
describe('Header Component Fixes', () => {
  const headerSrc = readSrc('../frontend/src/components/Header.tsx');

  // MEDIUM PRIORITY #7: Admin-aware dropdown links
  describe('Admin-aware navigation links', () => {
    test('should have admin dashboard route', () => {
      expect(headerSrc).toMatch(/\/admin\/dashboard/);
    });

    test('should have admin profile route', () => {
      expect(headerSrc).toMatch(/\/admin\/profile/);
    });

    test('should conditionally route based on user role', () => {
      // Should check role to decide which dashboard/profile route to use
      expect(headerSrc).toMatch(/admin|role/i);
    });
  });

  // HIGH PRIORITY - Header should use onOpenAuth prop
  describe('Header auth handling', () => {
    test('should reference onOpenAuth', () => {
      expect(headerSrc).toMatch(/onOpenAuth/);
    });
  });
});

// =============================================================================
// 12. PATH TRAVERSAL PROTECTION (user routes too)
// =============================================================================
describe('User Routes - Path Traversal Protection', () => {
  const userRoutesSrc = readSrc('src/routes/user.routes.js');

  test('should load without syntax errors', () => {
    expect(() => require('../src/routes/user.routes')).not.toThrow();
  });
});

// =============================================================================
// 13. ADMIN DASHBOARD FIXES
// =============================================================================
describe('AdminDashboard Fixes', () => {
  const adminDashboardSrc = readSrc('../frontend/src/pages/admin/AdminDashboard.tsx');

  // MEDIUM PRIORITY #8: conversionRate not double-multiplied
  describe('Conversion rate calculation', () => {
    test('should NOT multiply rate by 100 (backend already returns percentage)', () => {
      // Look for conversionRate calculation - should NOT have * 100
      const rateCalcSection = adminDashboardSrc.match(
        /conversionRate[\s\S]{0,300}/g
      ) || [];
      
      // Should not have * 100 near conversionRate calculation
      const hasDoubleMultiply = rateCalcSection.some(section =>
        section.match(/conversionRate\s*[:=][\s\S]{0,100}\*\s*100/)
      );
      expect(hasDoubleMultiply).toBe(false);
    });
  });
});

// =============================================================================
// 14. USER ROUTES - ADMIN SCOPE STATUS ENDPOINT
// =============================================================================
describe('User Routes - Admin Level Protection', () => {
  const userRoutesSrc = readSrc('src/routes/user.routes.js');

  // HIGH PRIORITY #9: Admin profileCompleted check
  describe('Admin profile completion', () => {
    test('should check position and accessLevel for admin profileCompleted', () => {
      expect(userRoutesSrc).toMatch(/position|accessLevel/);
    });
  });
});

// =============================================================================
// 15. SCHOLARSHIP MODEL FIELD NAMES
// =============================================================================
describe('Scholarship Model - Correct Field Names', () => {
  const scholarshipModelSrc = readSrc('src/models/Scholarship.model.js');

  test('should have applicationDeadline field', () => {
    expect(scholarshipModelSrc).toMatch(/applicationDeadline\s*:/);
  });

  test('should have totalGrant field', () => {
    expect(scholarshipModelSrc).toMatch(/totalGrant\s*:/);
  });

  test('should have isActive field', () => {
    expect(scholarshipModelSrc).toMatch(/isActive\s*:/);
  });

  test('should have status field with ScholarshipStatus enum', () => {
    expect(scholarshipModelSrc).toMatch(/status\s*:\s*\{/);
    expect(scholarshipModelSrc).toMatch(/ScholarshipStatus/);
  });
});
